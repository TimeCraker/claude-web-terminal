import ReactDOM from 'react-dom/client';
import '@xterm/xterm/css/xterm.css';
import App from './App';
import './styles/globals.css';
import { ThemeProvider } from './themes/ThemeProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
