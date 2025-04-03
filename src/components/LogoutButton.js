import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

function LogoutButton() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    return <button onClick={() => logout(navigate)}>Cerrar Sesión</button>;
}

export default LogoutButton;