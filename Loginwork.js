document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    const passwordInput = document.getElementById('password');
    const errorMessageDiv = document.getElementById('error-message');

    form.addEventListener('submit', (event) => {
        const password = passwordInput.value;
        if (!isValidPassword(password)) {
            event.preventDefault();
            showErrorMessage('Password must be more than 5 characters and contain at least one special character.');
        }
    });

    function isValidPassword(password) {
        const specialCharacterRegex = /[!@#$%^&*(),.?":{}|<>]/;
        return password.length > 5 && specialCharacterRegex.test(password);
    }

    function showErrorMessage(message) {
        errorMessageDiv.textContent = message;
        errorMessageDiv.style.display = 'block';
    }
});

function validateForm() {
    var terms = document.getElementById("terms");
    var errorMessage = document.getElementById("error-message");

    if (!terms.checked) {
        errorMessage.textContent = "You must agree to the terms and conditions.";
        return false; // Prevent form submission
    }

    errorMessage.textContent = ""; // Clear any previous error message
    return true; // Allow form submission
}


function togglePassword() {
    const passwordInput = document.getElementById('password');
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
    } else {
        passwordInput.type = 'password';
    }
}


