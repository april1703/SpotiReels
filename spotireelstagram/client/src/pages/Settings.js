import { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Form, Button, Alert } from "react-bootstrap";

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
    const [theme, setTheme] = useState("light");
    
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
        const newTheme = e.target.value;
        setTheme(newTheme);
    }

    useEffect(() => {
        if (settings.theme === "dark") {
            document.documentElement.classList.add("theme-dark");
            document.documentElement.classList.remove("theme-light");
        } else {
            document.documentElement.classList.add("theme-light");
            document.documentElement.classList.remove("theme-dark");
        }}, [theme]);

        useEffect(() => {

        const storedUsername = localStorage.getItem("username");
        if(!storedUsername) {
            console.warn("No username found for lighting mode update")
            return;
        }
        
        const specialLightingMode = settings.theme === "dark";
        fetch("http://localhost:3001/changeLightingMode", {
            method: "POST",
            headers: { "Content-Type": "application/json"},
            body: JSON.stringify({username: storedUsername, specialLightingMode})
        })
        .then(async (data) => {
            switch(data.status) {
                case 200:
                    console.log("Lighting settings changed successfully");
                    break;
                case 500:
                    console.error("Database error: " + data.message);
                    break;
                default:
                    console.error("Unexpected response status: " + data.status);
                }
            })
            .catch((err) => {
                console.error("Unexpected error: " + err.message);
            })
        }, [theme, formData.username]);
        
        const onSave = (e) => {
            e.preventDefault();
            writeSettings(settings);
            setSaved(true);
            setTimeout(() => setSaved(false), 1600);
        };
        
        
        const onReset = () => {
            setSettings(defaultSettings);
        };
        

    return (
        <Container fluid="md" className="py-4">
            <h2 style={{fontWeight: 700}}>Settings</h2>
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
                    <Form.Group controlID="username">
                        <Form.Label>Username</Form.Label>
                        <Form.Control
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={onChange} />
                    </Form.Group>
                    </Col>
                    
                    <Col md={6}>
                    <Form.Group controlID="currentPassword">
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
                        <Form.Group ControlID="checkPassword">
                            <Form.Label>Confirm New Password</Form.Label>
                            <Form.Control
                            type="password"
                            name="checkPassword"
                            value={formData.checkPassword}
                            onChange={onChange} />
                        </Form.Group>
                    </Col>
                </Row>

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

                <button
                    onClick={logout}
                    className="ms-auto"
                    variant="outline-danger"
                    style={{
                    position: "fixed",
                    right: "35px",
                    backgroundColor: "#8e2dd2ff",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    padding: "6px 12px",
                    cursor: "pointer",
                    fontSize: "14px"
                    }}
                    >
                        Logout
                    </button>
            </Form>    
        </Container>
    );
}

