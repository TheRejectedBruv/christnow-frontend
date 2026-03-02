document.getElementById('signin-form').addEventListener('submit', async function (event) {
  event.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const response = await fetch('/api/users/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }) // ✅ using email now
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    localStorage.setItem('token', data.token);
    document.getElementById('login-message').textContent = 'Login successful!';
    document.getElementById('login-message').style.color = 'green';
  } catch (error) {
    document.getElementById('login-message').textContent = 'Login failed. Check email and password.';
    document.getElementById('login-message').style.color = 'red';
  }
});
