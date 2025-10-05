const API_KEY = 'cc5b94165972aa509a349161d13d4fc9';

// Obtener ID de la serie desde la URL
const urlParams = new URLSearchParams(window.location.search);
const SERIE_ID = urlParams.get('id');
if (!SERIE_ID) {
  document.body.innerHTML = "<h2 style='text-align:center;'>❌ No se encontró ID de serie.</h2>";
  throw new Error("Falta ID TMDb");
}

const API_URL = `https://api.themoviedb.org/3/tv/${SERIE_ID}?api_key=${API_KEY}&language=es-MX`;
const EPISODES_URL = (s) => `https://api.themoviedb.org/3/tv/${SERIE_ID}/season/${s}?api_key=${API_KEY}&language=es-MX`;

// Inicializar JWPlayer
const player = jwplayer("zonaaps-jwplayer").setup({
  width: "100%",
  aspectratio: "16:9",
  stretching: "fill",
  controls: true,
  autostart: false,
  primary: "html5",
  playbackRateControls: true,
  skin: { name: "netflix" },
  cast: {},
  abouttext: "Reproductor TMDb",
  aboutlink: "https://www.jwplayer.com"
});

// Función para mostrar mensajes en el reproductor
function showPlayerMessage(message, isError = true) {
  const playerContainer = document.getElementById('player-container');
  if (!playerContainer) return;

  let messageElement = document.getElementById('player-msg');
  if (!messageElement) {
    messageElement = document.createElement('div');
    messageElement.id = 'player-msg';
    messageElement.style.position = 'absolute';
    messageElement.style.top = '10px';
    messageElement.style.left = '10px';
    messageElement.style.right = '10px';
    messageElement.style.padding = '10px';
    messageElement.style.borderRadius = '8px';
    messageElement.style.fontWeight = '600';
    messageElement.style.textAlign = 'center';
    messageElement.style.zIndex = '50';
    playerContainer.style.position = 'relative';
    playerContainer.appendChild(messageElement);
  }

  messageElement.style.backgroundColor = isError ? 'rgba(255,50,50,0.12)' : 'rgba(0,0,0,0.35)';
  messageElement.style.color = isError ? '#ffdddd' : '#fff';
  messageElement.textContent = message;
}

// Limpiar mensaje cuando se reproduce
player.on('play', () => {
  const el = document.getElementById('player-msg');
  if (el) el.style.display = 'none';
});

// Capturar errores de JWPlayer
player.on('error', (err) => {
  console.error('JWPLAYER ERROR:', err);
  showPlayerMessage('Error de reproducción. Revisa la consola (F12) para más detalles.', true);
});

// Cargar información de la serie
fetch(API_URL)
  .then(res => res.json())
  .then(data => {
    document.title = data.name;
    document.getElementById('titulo').textContent = data.name;
    document.getElementById('sinopsis').textContent = data.overview || 'Sin sinopsis';
    document.getElementById('poster').src = data.poster_path ? `https://image.tmdb.org/t/p/w300${data.poster_path}` : '';
    if (data.backdrop_path) {
      document.querySelector('header').style.backgroundImage = `url(https://image.tmdb.org/t/p/original${data.backdrop_path})`;
      document.querySelector('header').style.backgroundSize = 'cover';
      document.querySelector('header').style.backgroundPosition = 'center';
    }

    const select = document.getElementById('seasonSelect');
    (data.seasons || []).forEach(season => {
      if (season.season_number > 0) {
        const opt = document.createElement('option');
        opt.value = season.season_number;
        opt.textContent = `Temporada ${season.season_number}`;
        select.appendChild(opt);
      }
    });

    if (data.seasons && data.seasons[0]) loadEpisodes(data.seasons[0].season_number);
  })
  .catch(err => {
    console.error('Error TMDb:', err);
    showPlayerMessage('No se pudo cargar la info de TMDb.', true);
  });

// Cargar episodios de una temporada
function loadEpisodes(seasonNum) {
  fetch(EPISODES_URL(seasonNum))
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById('episodios');
      container.innerHTML = '';
      (data.episodes || []).forEach(ep => {
        const div = document.createElement('div');
        div.classList.add('episodio');
        div.innerHTML = `
          <img src="${ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : ''}" alt="${ep.name}">
          <h4>${ep.episode_number}. ${ep.name}</h4>
        `;
        div.addEventListener('click', () => loadEpisodeVideo(seasonNum, ep.episode_number, ep.still_path));
        container.appendChild(div);
      });
    })
    .catch(err => {
      console.error('Error cargando episodios:', err);
      showPlayerMessage('No se pudieron cargar los episodios.', true);
    });
}

document.getElementById('seasonSelect').addEventListener('change', (e) => {
  loadEpisodes(e.target.value);
});

// Detecta tipo de archivo según extensión
function detectType(url) {
  const path = url.split('?')[0].toLowerCase();
  if (path.endsWith('.m3u8')) return 'hls';
  if (path.endsWith('.mpd')) return 'dash';
  if (path.endsWith('.webm')) return 'webm';
  if (path.endsWith('.mp4') || path.endsWith('.m4v')) return 'mp4';
  return ''; // formato no soportado
}

// Cargar episodio en JWPlayer
async function loadEpisodeVideo(season, episode, backdrop) {
  try {
    showPlayerMessage('Cargando episodio...', false);
    const resp = await fetch(`enlaces/${SERIE_ID}.json`);
    if (!resp.ok) throw new Error(`No se encontró enlaces/${SERIE_ID}.json (status ${resp.status})`);
    const videos = await resp.json();
    const key = `s${season}e${episode}`;
    const link = videos[key];
    if (!link) {
      showPlayerMessage('❌ Episodio no disponible en el JSON', true);
      return;
    }

    const type = detectType(link);
    if (!type) {
      showPlayerMessage('⚠️ Formato no soportado por el navegador: ' + link.split('.').pop(), true);
      return;
    }

    console.log('Cargando capítulo:', key, '→', link, 'tipo_detectado=', type);

    player.load([{
      file: link,
      type: type,
      image: backdrop ? `https://image.tmdb.org/t/p/w780${backdrop}` : undefined,
      title: `S${season}E${episode}`
    }]);
    player.play(true);

    document.querySelector('#player-container').style.backgroundImage =
      backdrop ? `url(https://image.tmdb.org/t/p/original${backdrop})` : 'none';
    document.querySelector('#player-container').style.backgroundSize = 'cover';
    const el = document.getElementById('player-msg');
    if (el) el.style.display = 'none';
  } catch (err) {
    console.error('Error en loadEpisodeVideo:', err);
    showPlayerMessage(`Error cargando el enlace: ${err.message}`, true);
  }
}
