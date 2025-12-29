// frontend/src/pages/AuthPage.jsx (¡Actualizado para FLIP 3D!)

import React, { useState, useRef, useEffect } from 'react'; // Importamos useRef y useEffect
import { useNavigate } from 'react-router-dom';
import { login, register } from '../services/auth.service.js';
import './Auth.css';

function AuthPage() {
  const [activeTab, setActiveTab] = useState('login');
  const navigate = useNavigate();

  // Estados para Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Estados para Registro
  const [regNombre, setRegNombre] = useState('');
  const [regApellido, setRegApellido] = useState('');
  const [regRut, setRegRut] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');

  // Lógica de altura para el Flip
  const [formContainerHeight, setFormContainerHeight] = useState('auto');
  const loginFormRef = useRef(null);
  const registerFormRef = useRef(null);

  // Este hook mide la altura del formulario activo y la aplica al contenedor
  useEffect(() => {
    let height;
    if (activeTab === 'login') {
      height = loginFormRef.current?.scrollHeight;
    } else {
      height = registerFormRef.current?.scrollHeight;
    }
    // Añadimos un poco de padding (50px aprox = 2.5rem * 2)
    if (height) setFormContainerHeight(`${height + 50}px`);
  }, [activeTab]);



  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const data = await login(loginEmail, loginPassword);
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      const userRole = data.data.user.role;
      if (userRole === 'admin') navigate('/admin');
      else if (userRole === 'guardia') navigate('/guardia');
      else navigate('/alumno');
    } catch (err) {
      setLoginError(err.message);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');
    try {
      await register(regNombre, regApellido, regRut, regEmail, regPassword);
      setRegSuccess('¡Registro exitoso! Ya puedes iniciar sesión.');
      setTimeout(() => {
        setRegNombre(''); setRegApellido(''); setRegRut(''); setRegEmail(''); setRegPassword('');
        setRegSuccess('');
        setActiveTab('login'); // Cambiamos a la pestaña de login
      }, 2000);
    } catch (err) {
      setRegError(err.message);
    }
  };

  return (
    <div className="auth-page-container">
      {/* El .auth-card ahora solo contiene los botones */}
      <div className="auth-card">

        {/* Tabs */}
        <div className="auth-tabs">
          <button
            className={`auth-tab-button ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => setActiveTab('login')}
          >
            Iniciar Sesión
          </button>
          <button
            className={`auth-tab-button ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            Registrarse
          </button>
        </div>
      </div>

      {/* Contenedor Giratorio */}
      {/* Le pasamos la altura dinámica y la clase que activa el giro */}
      <div
        className={`auth-forms-container ${activeTab === 'register' ? 'is-flipped' : ''}`}
        style={{ height: formContainerHeight }}
      >

        <form
          ref={loginFormRef} // Añadimos la referencia
          onSubmit={handleLoginSubmit}
          className="auth-form auth-form-front" // Clase para la cara frontal
        >
          <h2>Login Bicicleteros</h2>
          <div className="form-group">
            <label>Email UBB:</label>
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <label>Contraseña:</label>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="form-input"
              required
            />
          </div>
          <button type="submit" className="form-button">Ingresar</button>
          {loginError && <p className="form-error">{loginError}</p>}
        </form>

        <form
          ref={registerFormRef} // Añadimos la referencia
          onSubmit={handleRegisterSubmit}
          className="auth-form auth-form-back" // Clase para la cara trasera
        >
          <h2>Registro de Usuario</h2>
          <div className="form-group">
            <label>RUT:</label>
            <input type="text" value={regRut} onChange={(e) => setRegRut(e.target.value)} className="form-input" placeholder="Ej: 12345678-9" required />
          </div>
          <div className="form-group">
            <label>Nombre:</label>
            <input type="text" value={regNombre} onChange={(e) => setRegNombre(e.target.value)} className="form-input" required />
          </div>
          <div className="form-group">
            <label>Apellido:</label>
            <input type="text" value={regApellido} onChange={(e) => setRegApellido(e.target.value)} className="form-input" required />
          </div>
          <div className="form-group">
            <label>Email UBB:</label>
            <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="form-input" placeholder="ej: nombre@alumnos.ubiobio.cl" required />
          </div>
          <div className="form-group">
            <label>Contraseña:</label>
            <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="form-input" required />
          </div>
          <button type="submit" className="form-button">Registrarse</button>
          {regError && <p className="form-error">{regError}</p>}
          {regSuccess && <p className="form-success">{regSuccess}</p>}
        </form>

      </div>
    </div>
  );
}

export default AuthPage;