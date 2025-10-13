import { useState, useEffect } from "react"
import axios from "axios"

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
      .post("http://127.0.0.1:3001/auth/login", {
        code,
      })
      .then(res => {
        setAccessToken(res.data.accessToken)
        setRefreshToken(res.data.refreshToken)
        setExpiresIn(res.data.expiresIn)
        // has tokens in localstorage so it can be reused throughout the app in other pages
        try {
          if (res.data.accessToken) window.localStorage.setItem('accessToken', res.data.accessToken)
          if (res.data.refreshToken) window.localStorage.setItem('refreshToken', res.data.refreshToken)
        } catch (e) {}
        window.history.pushState({}, null, "/")
      })
      .catch(() => {
        window.location = "/"
      })
  }, [code])

  useEffect(() => {
    if (!refreshToken || !expiresIn) return
    const interval = setInterval(() => {
      axios
        .post("http://127.0.0.1:3001/auth/refresh", {
          refreshToken,
        })
        .then(res => {
          setAccessToken(res.data.accessToken)
          setExpiresIn(res.data.expiresIn)
          try { if (res.data.accessToken) window.localStorage.setItem('accessToken', res.data.accessToken) } catch (e) {}
        })
        .catch(() => {
          window.location = "/"
        })
    }, (expiresIn - 60) * 1000)

    return () => clearInterval(interval)
  }, [refreshToken, expiresIn])

  return accessToken
}


