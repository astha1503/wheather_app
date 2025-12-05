const apiKey = '8cd5c913221bb2044e766567d7e6f93b';

document.addEventListener('DOMContentLoaded', () => {
	const iconEl = document.querySelector('.left-top i');
	const weatherTypeEl = document.getElementById('weather-type');
	const placeEl = document.getElementById('place');
	const tempEl = document.getElementById('temp');
	const humidityEl = document.querySelector('#humidity .value');
	const pressureEl = document.querySelector('#air-pressure .value');
	const rainEl = document.querySelector('#chance-of-rain .value');
	const windEl = document.querySelector('#wind-speed .value');

	let city = (placeEl && placeEl.textContent.trim()) || 'New Delhi';
	fetchWeather(city);

	const cityInput = document.getElementById('city-input');
	const changeBtn = document.getElementById('change-btn');

	if (cityInput) cityInput.value = city;

	function setCityFromInput() {
		if (!cityInput) return;
		const v = cityInput.value && cityInput.value.trim();
		if (!v) return;
		city = v;
		fetchWeather(city);
	}

	if (changeBtn) changeBtn.addEventListener('click', setCityFromInput);
	if (cityInput) cityInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') setCityFromInput(); });

	async function fetchWeather(cityName) {
		const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&units=metric&appid=${apiKey}`;
		try {
			const res = await fetch(weatherUrl);
			const data = await res.json();
			if (!res.ok) {
				alert(data.message || 'Could not fetch weather for that location');
				return;
			}

			const w = data.weather && data.weather[0];

			// Update main values
			tempEl.textContent = `${Math.round(data.main.temp)}°C`;
			weatherTypeEl.textContent = capitalize((w && w.description) || (w && w.main) || '');
			placeEl.textContent = `${data.name}${data.sys && data.sys.country ? ', ' + data.sys.country : ''}`;

			// Right-side details
			humidityEl.textContent = `${data.main.humidity}%`;
			pressureEl.textContent = `${data.main.pressure} hPa`;

			// Chance of rain: if `rain` object present show mm, otherwise show 0%
			if (data.rain) {
				const mm = data.rain['1h'] ?? data.rain['3h'] ?? 0;
				rainEl.textContent = `${mm} mm`;
			} else {
				rainEl.textContent = '0%';
			}

			// Wind speed: convert from m/s to km/h
			const windKmh = (data.wind && data.wind.speed) ? (data.wind.speed * 3.6) : 0;
			windEl.textContent = `${windKmh.toFixed(1)} km/h`;

			// Update icon using weather id / main
			const iconClass = mapToIconClass(w ? w.id : undefined, w ? w.main : undefined);
			if (iconEl) {
				iconEl.className = `wi ${iconClass}`;
			}

			// Save last city to localStorage so it persists across page reloads
			try { localStorage.setItem('weather_last_city', cityName); } catch (e) {}

			// Fetch forecast to populate bottom hourly boxes and set day
			try {
				const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(cityName)}&units=metric&appid=${apiKey}`;
				const fRes = await fetch(forecastUrl);
				const fData = await fRes.json();
				if (fRes.ok && fData.list && fData.list.length > 0) {
					const timeBoxes = Array.from(document.querySelectorAll('.bottom .temp-time .time'));
					const daySpan = document.querySelector('.bottom .day span');
					const cityTz = fData.city && typeof fData.city.timezone === 'number' ? fData.city.timezone : 0;

					for (let i = 0; i < timeBoxes.length; i++) {
						const entry = fData.list[i];
						if (!entry) {
							// hide or clear remaining boxes
							timeBoxes[i].querySelector('.box-time span').textContent = '';
							timeBoxes[i].querySelector('.box-temp span').textContent = '';
							const feel = timeBoxes[i].querySelector('.feel-temp span');
							if (feel) feel.textContent = '';
							continue;
						}

						// Calculate local date/time using city's timezone offset
						const localMillis = (entry.dt + cityTz) * 1000;
						const d = new Date(localMillis);
						const hour = d.getUTCHours(); // because we already added timezone, use UTC hour
						const ampm = hour >= 12 ? 'PM' : 'AM';
						const hour12 = ((hour + 11) % 12) + 1;
						const timeText = `${hour12}${ampm}`;

						const tempText = `${Math.round(entry.main.temp)}°C`;
						const feelText = `Feel like ${Math.round(entry.main.feels_like)}°C`;

						const boxTime = timeBoxes[i].querySelector('.box-time span');
						const boxTemp = timeBoxes[i].querySelector('.box-temp span');
						const feelEl = timeBoxes[i].querySelector('.feel-temp span');

						if (boxTime) boxTime.textContent = timeText;
						if (boxTemp) boxTemp.textContent = tempText;
						if (feelEl) feelEl.textContent = feelText;
					}

					// day ka name set kar rahi hu 
					if (daySpan) {
						const firstLocal = new Date((fData.list[0].dt + cityTz) * 1000);
						const weekday = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][firstLocal.getUTCDay()];
						daySpan.textContent = weekday;
					}
				}
			} catch (err) {
				console.warn('Forecast fetch failed', err);
			}

		} catch (err) {
			console.error(err);
			alert('Network error while fetching weather');
		}
	}

	function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

	function mapToIconClass(id, main) {
		// yaha icon change kiya hai 
		if (typeof id === 'number') {
			if (id >= 200 && id < 300) return 'wi-thunderstorm';
			if (id >= 300 && id < 400) return 'wi-sprinkle';
			if (id >= 500 && id < 600) return 'wi-rain';
			if (id >= 600 && id < 700) return 'wi-snow';
			if (id >= 700 && id < 800) return 'wi-fog';
			if (id === 800) return 'wi-day-sunny';
			if (id > 800) return 'wi-cloudy';
		}
		if (main) {
			const m = main.toLowerCase();
			if (m.includes('clear')) return 'wi-day-sunny';
			if (m.includes('cloud')) return 'wi-cloudy';
			if (m.includes('rain')) return 'wi-rain';
			if (m.includes('snow')) return 'wi-snow';
			if (m.includes('mist') || m.includes('fog') || m.includes('haze')) return 'wi-fog';
		}
		return 'wi-na';
	}

	// If there's a saved city, load it (overrides default)
	try {
		const saved = localStorage.getItem('weather_last_city');
		if (saved) fetchWeather(saved);
	} catch (e) {}

});