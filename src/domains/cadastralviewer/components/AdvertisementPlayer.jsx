import { useEffect, useRef, useState } from 'react'
import { getAdvertisementUrl } from '../api/cadastralViewerApi'

let youtubeApiPromise
let vimeoApiPromise

function getEmbedInfo(source) {
  try {
    const url = new URL(source)
    const host = url.hostname.replace(/^www\./, '')
    if (host === 'youtu.be' || host.endsWith('youtube.com') || host === 'youtube-nocookie.com') {
      const videoId = host === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v') || url.pathname.match(/\/embed\/([^/]+)/)?.[1]
      return videoId ? { provider: 'youtube', videoId } : null
    }
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const videoId = url.pathname.match(/\/(?:video\/)?(\d+)/)?.[1]
      return videoId ? { provider: 'vimeo', videoId } : null
    }
  } catch {
    return null
  }
  return null
}

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve, reject) => {
      let timeoutId
      const previousCallback = window.onYouTubeIframeAPIReady
      const onReady = () => {
        window.clearTimeout(timeoutId)
        previousCallback?.()
        resolve(window.YT)
      }
      window.onYouTubeIframeAPIReady = onReady
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      script.onerror = () => {
        window.clearTimeout(timeoutId)
        if (window.onYouTubeIframeAPIReady === onReady) window.onYouTubeIframeAPIReady = previousCallback
        youtubeApiPromise = null
        reject(new Error('No se pudo cargar YouTube Player API.'))
      }
      timeoutId = window.setTimeout(() => {
        if (window.onYouTubeIframeAPIReady === onReady) window.onYouTubeIframeAPIReady = previousCallback
        youtubeApiPromise = null
        reject(new Error('Tiempo de espera agotado al cargar YouTube Player API.'))
      }, 5000)
      document.head.appendChild(script)
    })
  }
  return youtubeApiPromise
}

function loadVimeoApi() {
  if (window.Vimeo?.Player) return Promise.resolve(window.Vimeo)
  if (!vimeoApiPromise) {
    vimeoApiPromise = new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        vimeoApiPromise = null
        reject(new Error('Tiempo de espera agotado al cargar Vimeo Player API.'))
      }, 5000)
      const script = document.createElement('script')
      script.src = 'https://player.vimeo.com/api/player.js'
      script.async = true
      script.onload = () => {
        window.clearTimeout(timeoutId)
        resolve(window.Vimeo)
      }
      script.onerror = () => {
        window.clearTimeout(timeoutId)
        vimeoApiPromise = null
        reject(new Error('No se pudo cargar Vimeo Player API.'))
      }
      document.head.appendChild(script)
    })
  }
  return vimeoApiPromise
}

function YouTubeIframeFallback({ videoId, title, className, autoPlay, loop, onEnded }) {
  const iframeRef = useRef(null)
  const onEndedRef = useRef(onEnded)
  const finishedRef = useRef(false)

  useEffect(() => { onEndedRef.current = onEnded }, [onEnded])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return undefined
    let attempts = 0
    let startTimeout
    finishedRef.current = false
    const advance = () => {
      if (finishedRef.current) return
      finishedRef.current = true
      window.clearTimeout(startTimeout)
      onEndedRef.current?.()
    }
    const send = (event, func, args = []) => iframe.contentWindow?.postMessage(
      JSON.stringify({ event, func, args, id: iframe.id, channel: 'widget' }), '*'
    )
    const subscribe = () => {
      send('listening')
      send('command', 'addEventListener', ['onStateChange'])
      send('command', 'addEventListener', ['onError'])
    }
    const onMessage = (event) => {
      if (event.source !== iframe.contentWindow) return
      let message
      try {
        message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
      } catch {
        return
      }
      const state = message?.event === 'onStateChange'
        ? message.info
        : message?.event === 'infoDelivery'
          ? message.info?.playerState ?? message.info
          : undefined
      if (message?.event === 'onError') advance()
      if (Number(state) === 1) window.clearTimeout(startTimeout)
      if (Number(state) === 0) advance()
      if (message?.event === 'infoDelivery' && message.info?.duration > 0 && message.info.currentTime >= message.info.duration - 0.75) advance()
    }
    const onLoad = () => subscribe()

    iframe.addEventListener('load', onLoad)
    window.addEventListener('message', onMessage)
    startTimeout = window.setTimeout(() => { if (!loop) advance() }, 15000)
    const handshake = window.setInterval(() => {
      subscribe()
      attempts += 1
      if (attempts >= 6) window.clearInterval(handshake)
    }, 500)
    const playbackPoll = window.setInterval(() => {
      send('command', 'getCurrentTime')
      send('command', 'getDuration')
      send('command', 'getPlayerState')
    }, 1000)
    return () => {
      iframe.removeEventListener('load', onLoad)
      window.removeEventListener('message', onMessage)
      window.clearInterval(handshake)
      window.clearInterval(playbackPoll)
      window.clearTimeout(startTimeout)
    }
  }, [loop, videoId])

  const params = new URLSearchParams({
    autoplay: String(Number(autoPlay)),
    controls: '0',
    disablekb: '1',
    enablejsapi: '1',
    fs: '0',
    loop: String(Number(loop)),
    mute: String(Number(autoPlay)),
    origin: window.location.origin,
    playsinline: '1',
    playlist: loop ? videoId : '',
    rel: '0',
  })
  return <iframe ref={iframeRef} id={`vc-youtube-${videoId}`} className={className} src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params}`} title={title} tabIndex={-1} allow="autoplay; encrypted-media; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" />
}

function YouTubePlayer({ videoId, title, className, autoPlay, loop, onEnded }) {
  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const onEndedRef = useRef(onEnded)
  const finishedRef = useRef(false)
  const [apiFailed, setApiFailed] = useState(false)

  useEffect(() => { onEndedRef.current = onEnded }, [onEnded])

  useEffect(() => {
    let cancelled = false
    let playbackPoll
    let startTimeout
    finishedRef.current = false
    const advance = () => {
      if (finishedRef.current) return
      finishedRef.current = true
      window.clearInterval(playbackPoll)
      window.clearTimeout(startTimeout)
      onEndedRef.current?.()
    }

    loadYouTubeApi().then((youtube) => {
      if (cancelled || !containerRef.current) return
      playerRef.current = new youtube.Player(containerRef.current, {
        width: '100%',
        height: '100%',
        videoId,
        playerVars: {
          autoplay: Number(autoPlay),
          controls: 0,
          disablekb: 1,
          enablejsapi: 1,
          fs: 0,
          loop: Number(loop),
          mute: Number(autoPlay),
          origin: window.location.origin,
          playsinline: 1,
          playlist: loop ? videoId : undefined,
          rel: 0,
        },
        events: {
          onReady: () => {
            startTimeout = window.setTimeout(() => {
              if (playerRef.current?.getPlayerState() !== youtube.PlayerState.PLAYING && !loop) advance()
            }, 30000)
            playbackPoll = window.setInterval(() => {
              const player = playerRef.current
              if (!player) return
              const duration = player.getDuration()
              if (player.getPlayerState() === youtube.PlayerState.ENDED || (duration > 0 && player.getCurrentTime() >= duration - 0.75)) advance()
            }, 1000)
          },
          onStateChange: (event) => {
            if (event.data === youtube.PlayerState.PLAYING) window.clearTimeout(startTimeout)
            if (event.data === youtube.PlayerState.ENDED) advance()
          },
          onError: advance,
        },
      })
    }).catch(() => setApiFailed(true))

    return () => {
      cancelled = true
      window.clearInterval(playbackPoll)
      window.clearTimeout(startTimeout)
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [autoPlay, loop, videoId])

  if (apiFailed) return <YouTubeIframeFallback {...{ videoId, title, className, autoPlay, loop, onEnded }} />
  return <div ref={containerRef} className={className} title={title} />
}

function VimeoPlayer({ videoId, title, className, autoPlay, loop, onEnded }) {
  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const onEndedRef = useRef(onEnded)
  const finishedRef = useRef(false)
  const [apiFailed, setApiFailed] = useState(false)

  useEffect(() => { onEndedRef.current = onEnded }, [onEnded])

  useEffect(() => {
    let playbackPoll
    let cancelled = false
    finishedRef.current = false
    const advance = () => {
      if (finishedRef.current) return
      finishedRef.current = true
      window.clearInterval(playbackPoll)
      onEndedRef.current?.()
    }

    loadVimeoApi().then((vimeo) => {
      if (cancelled || !containerRef.current) return
      const iframe = document.createElement('iframe')
      iframe.src = `https://player.vimeo.com/video/${encodeURIComponent(videoId)}?autoplay=${Number(autoPlay)}&muted=${Number(autoPlay)}&loop=${Number(loop)}&controls=0`
      iframe.title = title
      iframe.allow = 'autoplay; fullscreen; picture-in-picture'
      iframe.allowFullscreen = true
      iframe.tabIndex = -1
      iframe.referrerPolicy = 'strict-origin-when-cross-origin'
      iframe.style.width = '100%'
      iframe.style.height = '100%'
      iframe.style.border = '0'
      containerRef.current.replaceChildren(iframe)
      playerRef.current = new vimeo.Player(iframe)
      playerRef.current.on('ended', advance)
      playerRef.current.on('error', advance)
      playerRef.current.ready().then(() => {
        if (loop) return
        playbackPoll = window.setInterval(async () => {
          const player = playerRef.current
          if (!player) return
          try {
            const [duration, currentTime] = await Promise.all([player.getDuration(), player.getCurrentTime()])
            if (duration > 0 && currentTime >= duration - 0.75) advance()
          } catch {
            advance()
          }
        }, 1000)
      }).catch(advance)
    }).catch(() => setApiFailed(true))

    return () => {
      cancelled = true
      window.clearInterval(playbackPoll)
      playerRef.current?.destroy().catch(() => {})
      playerRef.current = null
    }
  }, [autoPlay, loop, title, videoId])

  if (apiFailed) return <iframe className={className} src={`https://player.vimeo.com/video/${encodeURIComponent(videoId)}?autoplay=${Number(autoPlay)}&muted=${Number(autoPlay)}&loop=${Number(loop)}&controls=0`} title={title} tabIndex={-1} allow="autoplay; fullscreen; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" />
  return <div ref={containerRef} className={className} title={title} />
}

export default function AdvertisementPlayer({ advertisement, className = '', autoPlay = false, loop = false, onEnded }) {
  const source = getAdvertisementUrl(advertisement)
  const embed = getEmbedInfo(source)
  if (embed && !onEnded) {
    const embedUrl = embed.provider === 'youtube'
      ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(embed.videoId)}?autoplay=${Number(autoPlay)}&mute=${Number(autoPlay)}&controls=${Number(!autoPlay)}`
      : `https://player.vimeo.com/video/${encodeURIComponent(embed.videoId)}?autoplay=${Number(autoPlay)}&muted=${Number(autoPlay)}&loop=${Number(loop)}&controls=${Number(!autoPlay)}`
    return <iframe className={className} src={embedUrl} title={advertisement.title} tabIndex={autoPlay ? -1 : undefined} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
  }
  if (embed?.provider === 'youtube') return <YouTubePlayer {...embed} title={advertisement.title} className={className} autoPlay={autoPlay} loop={loop} onEnded={onEnded} />
  if (embed?.provider === 'vimeo') return <VimeoPlayer {...embed} title={advertisement.title} className={className} autoPlay={autoPlay} loop={loop} onEnded={onEnded} />
  return <video className={className} src={source} controls={!autoPlay} autoPlay={autoPlay} muted={autoPlay} loop={loop} onEnded={onEnded} onError={autoPlay ? onEnded : undefined} playsInline preload="metadata" />
}