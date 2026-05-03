const API_BASE = "http://127.0.0.1:5002/api";
let art = null;
let currentAnime = null;

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsGrid = document.getElementById('resultsGrid');
const searchLoader = document.getElementById('search-loader');
const epLoader = document.getElementById('ep-loader');

const viewSearch = document.getElementById('view-search');
const viewPlayer = document.getElementById('view-player');
const backToSearch = document.getElementById('backToSearch');
const playerTitle = document.getElementById('playerTitle');
const playerSubtitle = document.getElementById('playerSubtitle');
const episodesList = document.getElementById('episodesList');

// Event Listeners
let currentEp = null;
searchBtn.addEventListener('click', () => performSearch(searchInput.value));
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch(searchInput.value);
});
document.getElementById('logoBtn').addEventListener('click', goHome);

function goHome() {
    window.location.hash = '';
    viewPlayer.classList.remove('active');
    viewSearch.classList.add('active');
    if (art) {
        art.destroy();
        art = null;
    }
    // Clear any iframe fallback playing in the background
    document.getElementById('artplayer').innerHTML = '';

    // Reset to Latest Updates
    searchInput.value = '';
    loadHome();
}

backToSearch.addEventListener('click', goHome);
document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.disabled) return;
        document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('langFilter').value = btn.dataset.lang;
        if (currentEp) playEpisode(currentEp);
    });
});

async function performSearch(query) {
    if (!query) return;
    resultsGrid.innerHTML = '';
    searchLoader.style.display = 'block';

    const heroBanner = document.getElementById('hero-banner');
    heroBanner.style.display = 'none';
    document.getElementById('grid-title').innerText = query === "Jujutsu Kaisen" ? "Trending Now" : `Search Results: ${query}`;

    try {
        const res = await fetch(`${API_BASE}/search?keyword=${encodeURIComponent(query)}`);
        const data = await res.json();

        searchLoader.style.display = 'none';

        if (data.results && data.results.length > 0) {
            // Setup Hero Banner with the first result
            const heroAnime = data.results[0];
            document.getElementById('hero-bg-img').src = heroAnime.poster;
            document.getElementById('hero-title').innerText = heroAnime.title;

            // Re-bind click event
            const oldBtn = document.getElementById('hero-play-btn');
            const newBtn = oldBtn.cloneNode(true);
            oldBtn.parentNode.replaceChild(newBtn, oldBtn);
            newBtn.addEventListener('click', () => openAnime(heroAnime));

            heroBanner.style.display = 'flex';

            // Render the rest in the Grid
            const gridResults = data.results.slice(1);
            gridResults.forEach(anime => {
                const card = document.createElement('div');
                card.className = 'anime-card';
                card.innerHTML = `
                    <div class="poster-wrapper">
                        <img src="${anime.poster}" alt="${anime.title}">
                        <div class="poster-gradient"></div>
                        <div class="card-content">
                            <div class="card-title" title="${anime.title}">${anime.title}</div>
                        </div>
                        <div class="play-overlay"><i class="fa-solid fa-play"></i></div>
                    </div>
                `;
                card.addEventListener('click', () => openAnime(anime));
                resultsGrid.appendChild(card);
            });
        } else {
            resultsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No results found.</p>';
        }
    } catch (e) {
        searchLoader.style.display = 'none';
        resultsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: red;">Error fetching results. Ensure API is running on port 5002.</p>';
    }
}

async function openAnime(anime) {
    currentAnime = anime;
    sessionStorage.setItem('currentAnime', JSON.stringify(anime));
    window.location.hash = 'watch/' + anime.ani_id;

    viewSearch.classList.remove('active');
    viewPlayer.classList.add('active');

    playerTitle.innerText = anime.title;
    playerSubtitle.innerText = "Loading episodes...";
    episodesList.innerHTML = '';
    epLoader.style.display = 'block';

    if (art) {
        art.destroy();
        art = null;
    }
    document.getElementById('artplayer').innerHTML = '<div style="display:flex; height:100%; justify-content:center; align-items:center; color:#888;">Select an episode to play</div>';

    try {
        const res = await fetch(`${API_BASE}/episodes/${anime.ani_id}`);
        const data = await res.json();
        epLoader.style.display = 'none';

        if (data.data && data.data.result && data.data.result.rangedEpisodes) {
            playerSubtitle.innerText = `${data.data.result.episodeCount} Episodes Available`;
            const eps = [];
            data.data.result.rangedEpisodes.forEach(group => {
                eps.push(...group.episodes);
            });

            // Sort episodes numerically just in case
            eps.sort((a, b) => a.number - b.number);

            eps.forEach(ep => {
                const btn = document.createElement('button');
                btn.className = 'ep-btn';
                btn.innerHTML = `Episode ${ep.number} ${ep.name !== String(ep.number) ? ` - ${ep.name}` : ''}`;
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.ep-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    playEpisode(ep);
                });
                episodesList.appendChild(btn);
            });

            // Auto play first ep if available
            if (eps.length > 0) {
                episodesList.firstChild.click();
            }
        } else {
            playerSubtitle.innerText = "No episodes found.";
        }
    } catch (e) {
        epLoader.style.display = 'none';
        playerSubtitle.innerText = "Error loading episodes.";
    }
}

async function playEpisode(ep) {
    currentEp = ep;
    if (art) {
        art.destroy();
        art = null;
    }
    document.getElementById('artplayer').innerHTML = '<div class="loader"></div>';
    playerSubtitle.innerText = `Playing Episode ${ep.number}... Resolving Servers...`;

    const serverListContainer = document.getElementById('serverList');
    const serverBtnsContainer = document.getElementById('serverButtonsContainer');
    serverListContainer.style.display = 'none';
    serverBtnsContainer.innerHTML = '';

    try {
        const srvRes = await fetch(`${API_BASE}/servers/${ep.token}`);
        const srvData = await srvRes.json();

        const selectedLang = document.getElementById('langFilter').value;

        if (!srvData.data || !srvData.data.result || srvData.data.result.length === 0) {
            throw new Error("No servers found for this episode.");
        }

        // Logic for enabling/disabling Sub/Dub UI buttons
        const hasSub = srvData.data.result.some(c => c.lang === 'sub');
        const hasDub = srvData.data.result.some(c => c.lang === 'dub');

        document.querySelectorAll('.lang-btn').forEach(btn => {
            if (btn.dataset.lang === 'sub') {
                btn.disabled = !hasSub;
            } else if (btn.dataset.lang === 'dub') {
                btn.disabled = !hasDub;
            }
        });

        const subCategory = srvData.data.result.find(c => c.lang === selectedLang) || srvData.data.result.find(c => c.lang === 'sub') || srvData.data.result[0];

        if (subCategory.lang !== selectedLang) {
            document.getElementById('langFilter').value = subCategory.lang;
            document.querySelectorAll('.lang-btn').forEach(b => {
                b.classList.remove('active');
                if (b.dataset.lang === subCategory.lang) b.classList.add('active');
            });
        }

        const links = subCategory.links || [];
        if (links.length === 0) throw new Error("No links available.");

        // Render Server Buttons UI
        serverListContainer.style.display = 'flex';
        links.forEach(link => {
            const btn = document.createElement('button');
            btn.className = 'server-btn';
            btn.id = `server-btn-${link.id}`;
            btn.innerText = link.server_title; // "Server 1", "Server 2"
            btn.addEventListener('click', () => {
                // Manual override
                playServer(link, ep.number);
            });
            serverBtnsContainer.appendChild(btn);
        });

        // Auto-play the first working server
        let played = false;
        for (const link of links) {
            const success = await playServer(link, ep.number, true);
            if (success) {
                played = true;
                break;
            }
        }

        if (!played) {
            throw new Error("All servers are dead or returned 404.");
        }

    } catch (e) {
        console.error(e);
        document.getElementById('artplayer').innerHTML = '<div style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100%; color:var(--text-muted); gap: 10px;"><h2><i class="fa-solid fa-link-slash"></i> Links Dead</h2><p>Servers for this episode have been removed by the provider.</p></div>';
        playerSubtitle.innerText = "Error playing video.";
    }
}

async function playServer(link, epNumber, isAuto = false) {
    if (art && !isAuto) {
        art.destroy();
        art = null;
        document.getElementById('artplayer').innerHTML = '<div class="loader"></div>';
    }

    // UI Update
    document.querySelectorAll('.server-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`server-btn-${link.id}`);
    if (btn) btn.classList.add('active');

    playerSubtitle.innerText = `Testing Server: ${link.server_title}...`;

    try {
        const streamRes = await fetch(`${API_BASE}/source/${link.id}`);
        const streamData = await streamRes.json();

        if (streamData.success && streamData.stream_data && streamData.stream_data.status === 200) {
            if (btn) {
                btn.classList.remove('dead');
                btn.classList.add('active');
            }
            if (streamData.stream_data.sources && streamData.stream_data.sources.length > 0) {
                const source = streamData.stream_data.sources.find(s => s.type === "hls") || streamData.stream_data.sources[0];
                const videoUrl = source.file;

                let subtitles = [];
                if (streamData.stream_data.tracks) {
                    subtitles = streamData.stream_data.tracks
                        .filter(t => t.kind === "captions")
                        .map(t => ({
                            html: t.label,
                            url: t.file,
                            default: t.default
                        }));
                }

                initPlayer(videoUrl, subtitles, epNumber);
                playerSubtitle.innerText = `Episode ${epNumber} - Auto/1080p (${link.server_title})`;
                return true;
            } else if (streamData.provider) {
                document.getElementById('artplayer').innerHTML = `<iframe src="${streamData.provider}" allowfullscreen style="width:100%; height:100%; border:none; border-radius:16px;"></iframe>`;
                playerSubtitle.innerText = `Episode ${epNumber} - Embedded Player (${link.server_title})`;
                return true;
            }
        }

        // If it reaches here, it means 404 or dead link
        if (btn) {
            btn.classList.remove('active');
            btn.classList.add('dead');
            btn.innerText = `${link.server_title} (Dead)`;
        }
        return false;
    } catch (err) {
        console.warn(`Server ${link.server_title} failed:`, err);
        if (btn) {
            btn.classList.remove('active');
            btn.classList.add('dead');
            btn.innerText = `${link.server_title} (Dead)`;
        }
        return false;
    }
}

function initPlayer(url, subtitles, epNumber) {
    document.getElementById('artplayer').innerHTML = '';

    art = new Artplayer({
        container: '#artplayer',
        url: url,
        title: `${currentAnime.title} - Episode ${epNumber}`,
        theme: '#FF1493',
        volume: 0.8,
        autoplay: true,
        pip: true,
        autoSize: true,
        autoMini: true,
        screenshot: true,
        setting: true,
        loop: false,
        flip: true,
        playbackRate: true,
        aspectRatio: true,
        fullscreen: true,
        subtitleOffset: true,
        miniProgressBar: true,
        mutex: true,
        backdrop: true,
        playsInline: true,
        autoPlayback: true,
        airplay: true,
        customType: {
            m3u8: function (video, url) {
                if (Hls.isSupported()) {
                    const hls = new Hls();
                    hls.loadSource(url);
                    hls.attachMedia(video);
                } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                    video.src = url;
                } else {
                    art.notice.show = 'Does not support playback of m3u8';
                }
            }
        },
        settings: subtitles.length > 0 ? [
            {
                width: 200,
                html: 'Subtitles',
                tooltip: 'English',
                icon: '<i class="fa-solid fa-closed-captioning"></i>',
                selector: [
                    { html: 'Off', url: '' },
                    ...subtitles
                ],
                onSelect: function (item) {
                    art.subtitle.url = item.url;
                    return item.html;
                },
            }
        ] : []
    });
}

async function loadHome() {
    resultsGrid.innerHTML = '';
    searchLoader.style.display = 'block';

    const heroBanner = document.getElementById('hero-banner');
    heroBanner.style.display = 'none';
    document.getElementById('grid-title').innerText = "Trending & Latest Updates";

    try {
        const res = await fetch(`${API_BASE}/home`);
        const data = await res.json();

        searchLoader.style.display = 'none';

        if (data.data && data.data.length > 0) {
            // Setup Hero Banner with the first result
            const heroAnime = data.data[0];
            document.getElementById('hero-bg-img').src = heroAnime.poster;
            document.getElementById('hero-title').innerText = heroAnime.title;

            // Re-bind click event
            const oldBtn = document.getElementById('hero-play-btn');
            const newBtn = oldBtn.cloneNode(true);
            oldBtn.parentNode.replaceChild(newBtn, oldBtn);
            newBtn.addEventListener('click', () => openAnime(heroAnime));

            heroBanner.style.display = 'flex';

            // Render the rest in the Grid
            const gridResults = data.data.slice(1);
            gridResults.forEach(anime => {
                const card = document.createElement('div');
                card.className = 'anime-card';
                card.innerHTML = `
                    <div class="poster-wrapper">
                        <img src="${anime.poster}" alt="${anime.title}">
                        <div class="poster-gradient"></div>
                        <div class="card-content">
                            <div class="card-title" title="${anime.title}">${anime.title}</div>
                        </div>
                        <div class="play-overlay"><i class="fa-solid fa-play"></i></div>
                    </div>
                `;
                card.addEventListener('click', () => openAnime(anime));
                resultsGrid.appendChild(card);
            });
        } else {
            resultsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No trending anime found.</p>';
        }
    } catch (e) {
        searchLoader.style.display = 'none';
        resultsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: red;">Error fetching results. Ensure API is running on port 5002.</p>';
    }
}

// Initial Load Logic
function initApp() {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#watch/')) {
        const stored = sessionStorage.getItem('currentAnime');
        if (stored) {
            const anime = JSON.parse(stored);
            // Verify it matches the hash
            if (hash === '#watch/' + anime.ani_id) {
                openAnime(anime);
                return;
            }
        }
    }
    // Default Home
    loadHome();
}

initApp();
