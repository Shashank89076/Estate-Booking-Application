document.getElementById('forgot-password-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    sessionStorage.setItem('email', email);  // Store email in sessionStorage
    const messageElement = document.getElementById('forgot-password-message');

    try {
        const response = await fetch('/request-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        if (response.ok) {
            messageElement.textContent = 'OTP has been sent to your email.';
            messageElement.style.color = 'green';
            // Redirect to OTP page after 4 seconds
            setTimeout(() => {
                window.location.href = '/otp.html';
            }, 4000);
            
        } else if (response.status === 404) { // Assuming the server returns 404 if the email is not found
            const error = await response.text();
            messageElement.textContent = `Error: ${error}`;
            messageElement.style.color = 'red';
        }
    } catch (error) {
        console.error('Error sending OTP:', error);
        messageElement.textContent = 'An error occurred. Please try again later.';
        messageElement.style.color = 'red';
    }
});


function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

