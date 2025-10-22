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

const logout = () => {
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

export default function Settings() {
    const initial = useMemo(readSettings, []);
    const [settings, setSettings] = useState(initial);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (settings.theme === "dark") {
            document.documentElement.classList.add("theme-dark");
            document.documentElement.classList.remove("theme-light");
        } else {
            document.documentElement.classList.add("theme-light");
            document.documentElement.classList.remove("theme-dark");
        }
    }, [settings.theme]);

    const onChange = (key) => (e) => {
        const value =
            e.target.type === "checkbox" ? e.target.checked : e.target.value;
        setSettings((s) => ({ ...s, [key]: value }));
    };

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
            <Row className="mb-3">
                <Col>
                    <h2 style={{ fontWeight: 700 }}>Settings</h2>
                    <p className="text-secondary mb-0">
                        Personalize your SpotiReelsTagram experience!
                    </p>
                </Col>
            </Row>

            {saved && (
                <Row className="mb-3">
                    <Col>
                        <Alert variant="success" className="py-2 mb-0">
                            Settings saved.
                        </Alert>
                    </Col>
                </Row>
            )}

            <Form onSubmit={onSave}>
                <Row className="g-3">
                    <Col md={6}>
                        <Form.Group>
                            <Form.Label>Display name</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="What should we call you?"
                                value={settings.displayName}
                                onChange={onChange("displayName")}
                            />
                            <Form.Text muted>Shown in parts of the app.</Form.Text>
                        </Form.Group>
                    </Col>

                    <Col md={6}>
                        <Form.Group>
                            <Form.Label>Country / Market</Form.Label>
                            <Form.Select
                                value={settings.country}
                                onChange={onChange("country")}
                            >
                                {["US", "CA", "GB", "AU", "DE", "FR", "JP", "KR"].map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>

                <hr className="my-4" />

                <Row className="g-3">
                    <Col md={6}>
                        <Form.Group>
                            <Form.Label>Theme</Form.Label>
                            <Form.Select value={settings.theme} onChange={onChange("theme")}>
                                <option value="dark">Dark</option>
                                <option value="light">Light</option>
                            </Form.Select>
                            <Form.Text muted>Applies instantly.</Form.Text>
                        </Form.Group>
                    </Col>

                    <Col md={6}>
                        <Form.Group>
                            <Form.Label>Audio Quality (previews)</Form.Label>
                            <Form.Select
                                value={settings.audioQuality}
                                onChange={onChange("audioQuality")}
                            >
                                <option value="low">Low</option>
                                <option value="normal">Normal</option>
                                <option value="high">High</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>

                <Row className="g-3 mt-1">
                    <Col md={6}>
                        <Form.Check
                            type="switch"
                            id="explicit-switch"
                            label="Allow explicit content"
                            checked={settings.allowExplicit}
                            onChange={onChange("allowExplicit")}
                        />
                    </Col>

                    <Col md={6}>
                        <Form.Check
                            type="switch"
                            id="autoplay-preview"
                            label="Autoplay 30s preview on card click"
                            checked={settings.autoplayPreview}
                            onChange={onChange("autoplayPreview")}
                        />
                    </Col>
                </Row>

                <div className="d-flex gap-2 mt-4">
                    <div className="d-flex gap-2">
                        <Button type="submit" variant="primary" style={{ backgroundColor:"#8e2dd2ff" }}>
                            Save changes
                        </Button>
                        <Button type="button" variant="outline-secondary" onClick={onReset}>
                            Reset to defaults
                        </Button>
                    </div>

                    <button
                    onClick={logout}
                    className="ms-auto"
                    variant="outline-danger"
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
                        Logout
                    </button>
                </div>
            </Form>

            <style>{`
                :root { --brand: #8e2dd2; }

                .btn-brand {
                    background-color: var(--brand);
                    border-color: var(--brand);
                }
                
                .btn-brand:hover, .btn-brand:focus {
                    background-color: #7b22bf;
                    border-color: #7b22bf;
                }

                .form-switch .form-check-input:checked {
                    background-color: var(--brand);
                    border-color: var(--brand);
                }
                
                .form-switch .form-check-input:focus {
                    box-shadow: 0 0 0 0.25rem rgba(142, 45, 210, 0.25);
                    border-color: var(--brand);
                }
                    
                .theme-dark { color-scheme: dark; }
                .theme-light { color-scheme: light; }
            `}</style>
        </Container>
    );
}