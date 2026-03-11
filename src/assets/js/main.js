document.addEventListener('DOMContentLoaded', () => {

	// Get all "navbar-burger" elements
	const $navbarBurgers = Array.prototype.slice.call(document.querySelectorAll('.navbar-burger'), 0);

	// Add a click event on each of them
	$navbarBurgers.forEach(el => {
		el.addEventListener('click', () => {

			// Get the target from the "data-target" attribute
			const target = el.dataset.target;
			const $target = document.getElementById(target);

			// Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
			el.classList.toggle('is-active');
			$target.classList.toggle('is-active');

		});
	});

	const $navbarItems = Array.prototype.slice.call(document.querySelectorAll('.navbar-item'), 0);

	$navbarItems.forEach(el => {
		el.addEventListener('click', () => {
			const $navbarBurger = document.querySelector('.navbar-burger');
			const $navbarMenu = document.querySelector('.navbar-menu');

			if ($navbarBurger.classList.contains('is-active')) {
				$navbarBurger.classList.remove('is-active');
				$navbarMenu.classList.remove('is-active');
			}
		});
	});

});


const contactForm = document.getElementById('contact-form');
const contactFormError = document.getElementById('contact-form-error');

contactForm.addEventListener('submit', async (event) => {
	event.preventDefault();

	const submitButton = contactForm.querySelector('button[type="submit"]');
	submitButton.disabled = true;

	try {
		// Collect all form values into an object
		const formData = new FormData(contactForm);
		const data = {};
		for (const [key, value] of formData.entries()) {
			data[key] = value;
		}

		// Send JSON to Lambda
		const response = await fetch('/api/contact', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});

		const result = await response.json();

		if (result.success) {
			contactForm.reset();
			contactFormError.classList.remove('has-text-danger');
			contactFormError.classList.add('has-text-success');
			contactFormError.textContent = 'Message sent successfully!';
		} else {
			contactFormError.classList.remove('has-text-success');
			contactFormError.classList.add('has-text-danger');
			contactFormError.textContent = result.message || 'Failed to send message.';
		}

	} catch (err) {
		console.error(err);
		contactFormError.classList.remove('has-text-success');
		contactFormError.classList.add('has-text-danger');
		contactFormError.textContent = 'An error occurred. Please try again.';
	} finally {
		submitButton.disabled = false;
	}
});
