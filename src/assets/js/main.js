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
const formOverlay = document.getElementById('form-overlay');
const loaderBorder = document.getElementById('loader-border');
const overlayCaption = document.getElementById('overlay-caption');
const submitButton = contactForm.querySelector('button[type="submit"]');



function showLoading() {
	submitButton.disabled = true;
	formOverlay.classList.add('visible');
}

function showSuccess(message) {
	loaderBorder.style.transform = getComputedStyle(loaderBorder).transform;
	loaderBorder.style.animation = 'none';

	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			formOverlay.classList.add('complete');
			overlayCaption.textContent = message || 'Message sent successfully!';
			overlayCaption.classList.add('visible');
		});
	});
}

function showError(message) {
	loaderBorder.style.transform = getComputedStyle(loaderBorder).transform;
	loaderBorder.style.animation = 'none';

	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			formOverlay.classList.add('error');
			overlayCaption.textContent = message || 'Something went wrong.';
			overlayCaption.classList.add('visible');
		});
	});
	setTimeout(hideOverlay, 3500);
}

function hideOverlay() {
	formOverlay.classList.remove('visible');
	submitButton.disabled = false;
	setTimeout(() => {
		formOverlay.classList.remove('complete', 'error');
		overlayCaption.classList.remove('visible');
		loaderBorder.style.transform = '';
		loaderBorder.style.animation = '';
	}, 300);
}

contactForm.addEventListener('submit', async (event) => {
	event.preventDefault();

	showLoading();
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
			showSuccess(result.message || 'Message sent successfully!');
			setTimeout(() => {
				hideOverlay();
			}, 3000);
		} else {
			showError(result.message || 'Failed to send message.');
			setTimeout(() => {
				hideOverlay();
			}, 3500);
		}

	} catch (err) {
		console.error(err);
		hideOverlay();
	} finally {
		submitButton.disabled = false;
	}
});
