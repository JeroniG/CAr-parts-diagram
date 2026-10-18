import { createRoot } from 'react-dom/client';
import App from './app/ApplicationRoot';
import './styles/global.css';
createRoot(document.getElementById('root')!).render(<App />);
