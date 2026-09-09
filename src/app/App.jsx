import { ToastContainer } from 'react-toastify'
import { AuthProvider } from '@/auth/context'
import { AppRoutes } from './routes'
import 'react-toastify/dist/ReactToastify.css'

export function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <ToastContainer position="top-center" autoClose={2500} theme="colored" hideProgressBar />
    </AuthProvider>
  )
}

export default App
