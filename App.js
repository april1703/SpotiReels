import 'bootstrap/dist/css/bootstrap.min.css'
import Login from './pages/Login'
import Home from './pages/Home'

const code = new URLSearchParams(window.location.search).get("code")

function App() {
  return code ? <Home code={code} /> : <Login />;
}

export default App;