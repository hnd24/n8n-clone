import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// StrictMode removed — causes Socket.IO double-connect issues
createRoot(document.getElementById('root')!).render(<App />)
