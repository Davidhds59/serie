const API_KEY = 'cc5b94165972aa509a349161d13d4fc9';

// Leer el parámetro ID de la URL
const urlParams = new URLSearchParams(window.location.search);
const SERIE_ID = urlParams.get('id');
if (!SERIE_ID) {
  document.body.innerHTML = "<h2 style='text-align:center;'>❌ No se encontró ID de serie.</h2>";
  throw new Error("Falta ID TMDb");
}

const API_URL = `https://api.themoviedb.org/3/tv/${SERIE_ID}?api_key=${API_KEY}&language=es-MX`;
const EPISODES_URL = (s) => `https://api.themoviedb.org/3/tv/${SERIE_ID}/season/${s}?api_key=${API_KEY}&language=es-MX`;

// ✅ Inicializar JWPlayer con soporte ampliado
const player = jwplayer("zonaaps-jwplayer").setup({
  width: "100%",
  aspectratio: "16:9",
  stretching: "fill",
  controls: true,
  autostart: false,
  primary: "html5",
  playbackRateControls: true,
  cast: {},
  skin: { name: "netflix" },
  abouttext: "Reproductor TMDb",
  aboutlink: "https://www.jwplayer.com"
});

// Cargar información de la serie
fetch(API_URL)
  .then(res => res.json())
  .then(data => {
    document.title = data.name;
    document.getElementById('titulo').textContent = data.name;
    document.getElementById('sinopsis').textContent = data.overview;
    document.getElementById('poster').src = `https://image.tmdb.org/t/p/w300${data.poster_path}`;
    document.querySelector('header').style.backgroundImage = `url(https://image.tmdb.org/t/p/original${data.backdrop_path})`;

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

// ✅ Cargar enlace desde carpeta /enlaces/ con detección de formato
function loadEpisodeVideo(season, episode, backdrop) {
  fetch(`enlaces/${SERIE_ID}.json`)
    .then(res => res.json())
    .then(videos => {
      const key = `s${season}e${episode}`;
      const link = videos[key];
      if (!link) {
        alert('❌ Episodio no disponible.');
        return;
      }

      // Detectar tipo de archivo
      let type = "mp4";
      if (link.endsWith(".m3u8")) type = "hls";
      else if (link.endsWith(".webm")) type = "webm";
      else if (link.endsWith(".mpd")) type = "dash";

      // Configurar JWPlayer con compatibilidad universal
      player.setup({
        file: link,
        type: type,
        width: "100%",
        aspectratio: "16:9",
        stretching: "fill",
        autostart: true,
        primary: "html5",
        playbackRateControls: true,
        skin: { name: "netflix" },
        cast: {},
        tracks: [],
        abouttext: "Reproductor TMDb",
        aboutlink: "https://www.jwplayer.com"
      });

      // Cambiar backdrop del reproductor
      document.querySelector('#player-container').style.backgroundImage =
        `url(https://image.tmdb.org/t/p/original${backdrop})`;
      document.querySelector('#player-container').style.backgroundSize = 'cover';
    })
    .catch(() => alert('⚠️ No se encontró el archivo de enlaces.'));
}
