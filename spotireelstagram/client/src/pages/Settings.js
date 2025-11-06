import React, { useContext, useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Form, Button, Alert } from "react-bootstrap";
import { ThemeContext } from "../ThemeContext";
import ThemeSwitch from "../ThemeSwitch";

const STORAGE_KEY = "app_settings_v1";
const defaultSettings = {
    displayName: "",
    theme: "dark",
    audioQuality: "high",
    allowExplicit: true,
    country: "US",
    autoplayPreview: true,
};

function readSettings() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
    } catch {
        return defaultSettings;
    }
}
function writeSettings(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
export function logout() {
    try {
        window.localStorage.removeItem('accessToken');
        window.localStorage.removeItem('refreshToken');
        window.localStorage.removeItem('dev_spotify_token');
        window.localStorage.removeItem('sr_accessToken');
    } catch (e) {}
    // navigate to login/root and force reload to reset app state
    window.history.pushState({}, '', '/');
    window.location.reload();
};

export default function Settings() {
    const { theme, toggleTheme, setTheme } = useContext(ThemeContext);
    const initial = useMemo(readSettings, []);
    const [settings, setSettings] = useState(initial);
    const [saved, setSaved] = useState(false);
    
    // change password settings
    const [formData, setFormData] = useState({
        username: '',
        currentPassword: '',
        newPassword: '',
        checkPassword: '',
    })
    const [msg, setMsg] = useState("");
    
    // PASSWORD CHANGE FUNCTION
    const handleSubmit = async (event) => {
        event.preventDefault();
        
        const { username, currentPassword, newPassword, checkPassword } = formData;
        
        if (!username || !currentPassword || !newPassword) {
            setMsg("Please fill in all fields.");
            return;
        }

        if (newPassword !== checkPassword) {
            setMsg("New password do not match.");
            return;
        }
        
        fetch("http://localhost:3001/changePassword", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify ({
                    username,
                    currentPassword,
                    proposedPassword: newPassword,
                }),
            })
            .then(async (data) => {
                switch (data.status) {
                    case 200:
                        console.log("Password changed successfully");
                        setMsg("Password changed successfully!");
                        break;
                    case 403:
                        console.error("Username or password does not match database");
                        setMsg("Username or password doesn't match. characters in input.");
                        break;
                    case 404:
                        console.error("Not Found");
                        setMsg("User not found");
                        break;
                    case 500:
                        console.error("Database error: " + data.msg);
                        setMsg("Server or database error.");
                        break;
                    default:
                        console.error("Unexpected response status: " + data.status);    
                }
                                    
            })
            .catch((err) => {
                console.error("Unexpected error: " + err.message);
            })
        }
                            
        const onChange = (e) => {
            const { name, value } = e.target;
            setFormData((prevData) => ({
                ...prevData,
                [name]: value,
            }))
                                
        };
    
    // THEME TOGGLE
    const handleThemeChange = (e) => {
        const next = e.target.value;
        setTheme(next);
        setSettings((s) => ({ ...s, theme: next }));
    };

    useEffect(() => {
        const storedUsername =
            formData.username || localStorage.getItem("username");
        if (!storedUsername) {
            return;
        }
        const specialLightingMode = theme === "dark";

        fetch("http://localhost:3001/changeLightingMode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: storedUsername, specialLightingMode }),
        }).catch(() => {});
    }, [theme, formData.username]);
        
    const onSave = (e) => {
        e.preventDefault();
        writeSettings({ ...settings, theme });
        setSaved(true);
        setTimeout(() => setSaved(false), 1600);
    };
        
        
    const onReset = () => {
        setSettings(defaultSettings);
        setTheme("dark");
    };
        

    return (
        <Container fluid="md" className="py-4">
            <h2 style={{fontWeight: 700}}>Settings</h2>
            <div className="p-3 mb-4 rounded" style={{ border: "1px solid var(--border)" }}>
                <h4 className="mb-3">Appearance</h4>
                <Row className="align-items-center">
                    <Col md="auto">
                        <ThemeSwitch />
                    </Col>
                    <Col>
                        <div className="fw-semibold">Color theme</div>
                        <div className="text-muted small">Changes apply instantly across the app.</div>
                    </Col>
                </Row>
            </div>
            <h4 className="mb-4">Change Password</h4>
            {msg && (
                <Alert
                variant = {
                    msg.includes("successfully")
                    ? "success"
                    : msg.includes("match")
                    ? "warning"
                    : "danger"       
                }
                >
                    {msg}
                </Alert>
            )}
            <Form onSubmit={handleSubmit}>
                <Row className="mb-3">
                    <Col md={6}>
                    <Form.Group controlId="username">
                        <Form.Label>Username</Form.Label>
                        <Form.Control
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={onChange} />
                    </Form.Group>
                    </Col>
                    
                    <Col md={6}>
                    <Form.Group controlId="currentPassword">
                        <Form.Label>Current Password</Form.Label>
                        <Form.Control
                        type="password"
                        name="currentPassword"
                        value={formData.currentPassword}
                        onChange={onChange} />
                    </Form.Group>
                    </Col>
                </Row>

                <Row className="mb-3">
                    <Col md={6}>
                    <Form.Group controlId="newPassword">
                        <Form.Label>New Password</Form.Label>
                        <Form.Control
                        type="password"
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={onChange} />
                    </Form.Group>
                    </Col>

                    <Col md={6}>
                        <Form.Group controlId="checkPassword">
                            <Form.Label>Confirm New Password</Form.Label>
                            <Form.Control
                            type="password"
                            name="checkPassword"
                            value={formData.checkPassword}
                            onChange={onChange} />
                        </Form.Group>
                    </Col>
                </Row>

                <div className="d-flex align-items-center gap-2 mb-5">
                    <button
                        type="submit"
                        style={{
                            backgroundColor: "#8e2dd2ff",
                            color: "white",
                            border: "none",
                            borderRadius: "5px",
                            padding: "6px 12px",
                            cursor: "pointer",
                            fontSize: "14px"
                        }}
                    >
                        Change Password
                    </button>
                    
                    <Button
                        onClick={logout}
                        className="ms-auto"
                        variant="outline-danger"
                        style={{ 
                            backgroundColor: "#8e2dd2ff",
                            color: "white",
                            border: "none"
                        }}
                    >
                        Logout
                    </Button>
                </div>

                <div className="mt-2 d-flex gap-2">
                    <Button
                        onClick={onSave}
                        title="Save general preferences"
                        style={{
                            backgroundColor: "#8e2dd2ff",
                            color: "white",
                            border: "none",
                        }}
                    >
                        Save Preferences
                    </Button>

                    <Button variant="outline-secondary" onClick={onReset}>
                        Reset to Defaults
                    </Button>
                </div>
            </Form>    
        </Container>
    );
}

