document.getElementById('loginForm').addEventListener('submit', async function (event) {
    event.preventDefault(); // Evita el envío normal del formulario
  
    const email = event.target.email.value;
    const contraseña = event.target.contraseña.value;
  
    try {
      const response = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, contraseña })
      });
  
      const data = await response.json();
  
      if (response.ok) {
        alert(data.message);
        localStorage.setItem('token', data.token); // Guarda el token en localStorage

        // Redirecciona al usuario después del login exitoso
        window.location.href = '/index.html'; // Cambia '/dashboard.html' por la ruta deseada
    } else {
        alert(data.message); // Muestra mensaje de error
    }
  } catch (error) {
    console.error('Error en la solicitud:', error);
  }
});
  