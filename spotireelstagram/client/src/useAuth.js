import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import axios from "axios";

//USEAUTH EXPLANATION
// custom hook to manage Spotify authentication
// exchanges authorization code (found in URL) for access code(expires every like ten minutes) and refresh tokens
// handles token refresh before expiration (accessToken expires every hour about)
// stores tokens in localStorage so they can be reused across sessions

export default function useAuth(code) {
  const [accessToken, setAccessToken] = useState()
  const [refreshToken, setRefreshToken] = useState()
  const [expiresIn, setExpiresIn] = useState()

  useEffect(() => {
    if (!code) return

    axios
      .post("http://127.0.0.1:3001/auth/login", { code })
      .then(res => {
        setAccessToken(res.data.accessToken)
        setRefreshToken(res.data.refreshToken)
        setExpiresIn(res.data.expiresIn)
        
        // has tokens in localstorage so it can be reused throughout the app in other pages
        localStorage.setItem("accessToken", res.data.accessToken);
        localStorage.setItem("refreshToken", res.data.refreshToken);
        window.history.pushState({}, null, "/");

      })  
      .catch(() => {
        window.location = "/"
      })
  }, [code])

  useEffect(() => {
    if (!refreshToken || !expiresIn) return;
    const interval = setInterval(() => {
      axios
        .post("http://127.0.0.1:3001/auth/refresh", { refreshToken })
        .then(res => {
          setAccessToken(res.data.accessToken)
          setExpiresIn(res.data.expiresIn)
          localStorage.setItem("accessToken", res.data.accessToken);
        })
        .catch(() => {
          window.location = "/"
        })
    }, (expiresIn - 60) * 1000)

    return () => clearInterval(interval)
  }, [refreshToken, expiresIn])

  return accessToken
}

export function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const code = params.get("code");

  const accessToken = useAuth(code);

  useEffect(() => {
    if (accessToken) navigate("/home");
  }, [accessToken, navigate]);

  return <p>Authenticating with Spotify...</p>
}
