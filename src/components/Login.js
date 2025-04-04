import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Modal, Button, Form } from "react-bootstrap";
import 'bootstrap/dist/css/bootstrap.min.css';
import "../styles/Login.css";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import Swal from "sweetalert2";

const logo = "/logoweb.jpg";

function Login() {
    const [correo, setCorreo] = useState("");
    const [contraseña, setContraseña] = useState("");
    const [modal, setModal] = useState(false);
    const [formData, setFormData] = useState({
        nombre: "",
        correo: "",
        contraseña: ""
    });

    const navigate = useNavigate();
    const { login } = useAuth();

    // Definir la URL base desde la variable de entorno
    const apiUrl = process.env.REACT_APP_API_URL;

    useEffect(() => {
        const closeOnEscape = (e) => {
            if (e.key === "Escape") setModal(false);
        };
        document.addEventListener("keydown", closeOnEscape);
        return () => document.removeEventListener("keydown", closeOnEscape);
    }, []);

    const handleLogin = (e) => {
        e.preventDefault();

        // Reemplazar axios con fetch
        fetch(`${apiUrl}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ correo, contraseña })
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.token) {
                    localStorage.setItem("token", data.token);
                    localStorage.setItem("userSession", JSON.stringify({
                        userId: data.userId,
                        tipo_usuario: data.tipo_usuario,
                        token: data.token
                    }));

                    login(data.token, data.userId, data.tipo_usuario);

                    Swal.fire({
                        icon: "success",
                        title: "Inicio de sesión exitoso",
                        text: "Bienvenido de nuevo",
                        timer: 2000,
                        showConfirmButton: false
                    });

                    if (data.tipo_usuario === 1) {
                        navigate("/admin");
                    } else {
                        navigate("/home");
                    }
                } else {
                    Swal.fire({
                        icon: "error",
                        title: "Error",
                        text: data.error || "Error al iniciar sesión"
                    });
                }
            })
            .catch((error) => {
                console.error("Error de conexión:", error);
                Swal.fire({
                    icon: "error",
                    title: "Error de conexión",
                    text: "No se pudo conectar con el servidor"
                });
            });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${apiUrl}/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData)
            });
            const data = await response.json();

            if (data.success) {
                Swal.fire({
                    icon: "success",
                    title: "Registro exitoso",
                    text: "Ya puedes iniciar sesión",
                    confirmButtonColor: "#3085d6"
                });
                setModal(false);
                setFormData({ nombre: "", correo: "", contraseña: "" });
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: data.error
                });
            }
        } catch (error) {
            console.error("❌ Error al registrar:", error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Error al registrar usuario"
            });
        }
    };

    const handleChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    // 🔹 INICIAR SESIÓN CON GOOGLE
    const handleGoogleLogin = async (credentialResponse) => {
        try {
            const decoded = jwtDecode(credentialResponse.credential);
            const { email, name } = decoded;

            const res = await fetch(`${apiUrl}/auth/google`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, name })
            });
            const data = await res.json();

            if (!data.token) {
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: data.error || "Error al iniciar sesión con Google"
                });
                return;
            }

            localStorage.setItem("token", data.token);
            localStorage.setItem("userSession", JSON.stringify({
                userId: data.user.id_usuario,
                tipo_usuario: data.user.tipo_usuario,
                token: data.token
            }));

            login(data.token, data.user.id_usuario, data.user.tipo_usuario);

            Swal.fire({
                icon: "success",
                title: "Inicio de sesión exitoso",
                text: "Bienvenido de nuevo",
                timer: 2000,
                showConfirmButton: false
            });

            if (data.user.tipo_usuario === 1) {
                navigate("/admin");
            } else {
                navigate("/home");
            }
        } catch (error) {
            console.error("Error al iniciar sesión con Google:", error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Ocurrió un error al iniciar sesión"
            });
        }
    };

    // 🔹 REGISTRO CON GOOGLE (dentro del modal)
    const handleGoogleRegister = async (credentialResponse) => {
        try {
            const decoded = jwtDecode(credentialResponse.credential);
            const { email, name } = decoded;

            const res = await fetch(`${apiUrl}/register/google`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, name })
            });
            const data = await res.json();

            Swal.fire({
                icon: data.success ? "success" : "error",
                title: data.success ? "Registro exitoso" : "Error",
                text: data.message || data.error
            });

            if (data.success) {
                setModal(false);
            }

        } catch (error) {
            console.error("❌ Error al registrar con Google:", error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Error al registrar cuenta con Google"
            });
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <img src={logo} alt="Bike Light Logo" className="logo" />
                <h2>Bike Light</h2>

                <form onSubmit={handleLogin}>
                    <input type="email" placeholder="Correo" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
                    <input type="password" placeholder="Contraseña" value={contraseña} onChange={(e) => setContraseña(e.target.value)} required />
                    <button type="submit">Iniciar Sesión</button>
                </form>

                <div style={{ marginTop: "15px", textAlign: "center" }}>
                    <GoogleLogin
                        onSuccess={handleGoogleLogin}
                        onError={() => Swal.fire({
                            icon: "error",
                            title: "Error",
                            text: "No se pudo iniciar sesión con Google"
                        })}
                    />
                </div>

                <button onClick={() => setModal(true)} className="register-button">
                    Registrarse
                </button>
            </div>

            <Modal show={modal} onHide={() => setModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Registro</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleRegister}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Nombre completo</Form.Label>
                            <Form.Control
                                type="text"
                                id="nombre"
                                value={formData.nombre}
                                onChange={handleChange}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Correo</Form.Label>
                            <Form.Control
                                type="email"
                                id="correo"
                                value={formData.correo}
                                onChange={handleChange}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Contraseña</Form.Label>
                            <Form.Control
                                type="password"
                                id="contraseña"
                                value={formData.contraseña}
                                onChange={handleChange}
                                required
                            />
                        </Form.Group>

                        <hr />
                        <div style={{ textAlign: "center" }}>
                            <p><strong>O registrarse con Google</strong></p>
                            <GoogleLogin
                                onSuccess={handleGoogleRegister}
                                onError={() => Swal.fire({
                                    icon: "error",
                                    title: "Error",
                                    text: "Error al registrar con Google"
                                })}
                            />
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
                        <Button type="submit" variant="primary">Registrar</Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
}

export default Login;