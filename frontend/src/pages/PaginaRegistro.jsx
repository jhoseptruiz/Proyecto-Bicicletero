// Proyecto-Bicicletero/frontend/src/pages/PaginaRegistro.jsx

import React, {useState} from 'react';
import {useNavigate, Link} from 'react-router-dom';
import { register } from '../services/auth.service.js';

function PaginaRegistro(){
    
    // --- Estados del Formulario ---
    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState('');
    const [rut, setRut] = useState(''); 
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    // --- Estados de UI (Feedback) ---
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // --- Hooks ---
    const navigate = useNavigate();

    // --- Manejador del Submit ---
    const handleSubmit = async (e)=>{
        e.preventDefault();
        setError('');
        setSuccess('');

        try{
            // Llamando al servicio de registro
            const data = await register(nombre, apellido, rut, email, password);

            setSuccess('¡Registro exitoso! Redirigiendo al login..');
            
            // Redirigiendo al login
            setTimeout(()=>{
                navigate('/login');
            },2000);

        } catch(err){
            // Mostrar error
            setError(err.message);
        }
    };
    
    // --- Renderizado del Componente ---
    return(
        <div>
            <h2>Registro de usuario</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Nombre: </label>
                    <input
                    type = "text"
                    value ={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required>
                    </input>
                </div>
                <div>
                    <label>Apellido: </label>
                    <input
                        type = "text"
                        value= {apellido}
                        onChange= {(e)=>setApellido(e.target.value)}
                        required>
                    </input>
                </div>

                <div>
                    <label>RUT: </label>
                    <input
                        type = "text"
                        value= {rut}
                        onChange= {(e) => setRut(e.target.value)}
                        placeholder = "Ej: 12345678-9"
                        required>
                    </input>
                </div>
                
                <div>
                    <label>Email: </label>
                    <input
                        type= "email"
                        value= {email}
                        onChange= {(e) => setEmail(e.target.value)}
                        placeholder = "ej: nombre@alumnos.ubiobio.cl/ @ubiobio.cl"
                        required>
                    </input>
                </div>
                <div>
                    <label>Contraseña: </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e)=>setPassword(e.target.value)}
                        required>
                    </input>
                </div>
                <button type="submit">Registrarse</button>
            </form>
            
            {/* Mensajes de feedback */}
            {error && <p style={{color: 'red'}}>{error}</p>}
            {success && <p style={{color: 'green'}}>{success}</p>}
            
            <p>
                ¿Ya tienes una cuenta? <Link to = "/login">Inicia sesión aqui</Link>
            </p>
        </div>
    );
}
export default PaginaRegistro;