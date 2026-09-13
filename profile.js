// Show the Profile Section
function showProfileSection() {
    const profileSection = document.getElementById('profile-section');
    const mainContent = document.getElementById('main-content');

    // Hide other sections and display the profile section
    mainContent.innerHTML = '';
    profileSection.style.display = 'block';

    // Fetch and pre-fill profile data
    fetchProfileData();
}

// Fetch Profile Data
async function fetchProfileData() {
    const email = sessionStorage.getItem('email'); // Email stored in session

    try {
        const response = await fetch(`/get-profile?email=${email}`);
        const profileData = await response.json();

        // Populate the form fields
        if (profileData) {
            document.getElementById('first-name').value = profileData.firstName || '';
            document.getElementById('last-name').value = profileData.lastName || '';
            document.getElementById('phone').value = profileData.phone || '';
            document.getElementById('address-line-1').value = profileData.address?.line1 || '';
            document.getElementById('address-line-2').value = profileData.address?.line2 || '';
            document.getElementById('city').value = profileData.address?.city || '';
            document.getElementById('state').value = profileData.address?.state || '';
            document.getElementById('country').value = profileData.address?.country || '';
            document.getElementById('education').value = profileData.education || '';
        }
    } catch (error) {
        console.error('Error fetching profile data:', error);
    }
}

// Save Profile Data
document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = sessionStorage.getItem('email'); // Email already stored in session
    const firstName = document.getElementById('first-name').value;
    const lastName = document.getElementById('last-name').value;
    const phone = document.getElementById('phone').value;
    const address = {
        line1: document.getElementById('address-line-1').value,
        line2: document.getElementById('address-line-2').value,
        city: document.getElementById('city').value,
        state: document.getElementById('state').value,
        country: document.getElementById('country').value
    };
    const education = document.getElementById('education').value;

    try {
        const response = await fetch('/save-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, firstName, lastName, phone, address, education })
        });

        if (response.ok) {
            alert('Profile updated successfully.');
        } else {
            alert('Error updating profile.');
        }
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Error saving profile.');
    }
});
