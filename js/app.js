// Configura tu clave TMDb
const API_KEY = 'cc5b94165972aa509a349161d13d4fc9'; 
const SERIE_ID = '1396'; // Ejemplo: Breaking Bad

const API_URL = `https://api.themoviedb.org/3/tv/${SERIE_ID}?api_key=${API_KEY}&language=es-MX`;
const EPISODES_URL = (season) => `https://api.themoviedb.org/3/tv/${SERIE_ID}/season/${season}?api_key=${API_KEY}&language=es-MX`;

const player = jwplayer("zonaaps-jwplayer").setup({
  width: "100%",
  aspectratio: "16:9",
  stretching: "fill",
  controls: true,
  autostart: false,
  skin: { name: "netflix" }
});

// Cargar datos de la serie
fetch(API_URL)
  .then(res => res.json())
  .then(data => {
    document.getElementById('titulo').textContent = data.name;
    document.getElementById('sinopsis').textContent = data.overview;
    document.getElementById('poster').src = `https://image.tmdb.org/t/p/w300${data.poster_path}`;
    document.querySelector('header').style.backgroundImage = `url(https://image.tmdb.org/t/p/original${data.backdrop_path})`;
    document.querySelector('header').style.backgroundSize = 'cover';
    document.querySelector('header').style.backgroundPosition = 'center';

    const select = document.getElementById('seasonSelect');
    data.seasons.forEach(season => {
      if (season.season_number > 0) {
        const opt = document.createElement('option');
        opt.value = season.season_number;
        opt.textContent = `Temporada ${season.season_number}`;
        select.appendChild(opt);
      }
    });

    loadEpisodes(data.seasons[0].season_number);
  });

// Cargar episodios
function loadEpisodes(seasonNum) {
  fetch(EPISODES_URL(seasonNum))
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById('episodios');
      container.innerHTML = '';

      data.episodes.forEach(ep => {
        const div = document.createElement('div');
        div.classList.add('episodio');
        div.innerHTML = `
          <img src="https://image.tmdb.org/t/p/w300${ep.still_path}" alt="${ep.name}">
          <h4>${ep.episode_number}. ${ep.name}</h4>
        `;
        div.addEventListener('click', () => loadEpisodeVideo(seasonNum, ep.episode_number, ep.still_path));
        container.appendChild(div);
      });
    });
}

document.getElementById('seasonSelect').addEventListener('change', (e) => {
  loadEpisodes(e.target.value);
});

// Cargar video desde enlaces.json
function loadEpisodeVideo(season, episode, backdrop) {
  fetch('enlaces.json')
    .then(res => res.json())
    .then(videos => {
      const link = videos[`s${season}e${episode}`];
      if (link) {
        player.load([{ file: link }]);
        player.play();

        document.querySelector('#player-container').style.backgroundImage = `url(https://image.tmdb.org/t/p/original${backdrop})`;
        document.querySelector('#player-container').style.backgroundSize = 'cover';
        document.querySelector('#player-container').style.backgroundPosition = 'center';
      } else {
        alert('Enlace no disponible.');
      }
    });
}
