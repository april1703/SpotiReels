import 'bootstrap/dist/css/bootstrap.min.css';
import Login from './pages/Login';
import Home from './pages/Home';
import Search from './pages/Search';

const code = new URLSearchParams(window.location.search).get("code");
const path = window.location.pathname;

export default function App() {
  if (path === '/search') return <Search />;
  return code ? <Home code={code} /> : <Login />;
}
