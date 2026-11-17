import express from 'express';
import xml from 'xml';
import {XMLBuilder, XMLParser} from 'fast-xml-parser';
import {getConfig, updateConfig} from './db.js';
import {GLOBAL_SETTINGS, VERSION} from './config.js';
import {searchMovies, scrapTorrents, hasNonEnglishCharacters} from './scraper.js';
import {createRssFeed, torznabTest, noTopics} from './torznab.js';

const router = express.Router();

const processKeyword = key => {
	const searchKey = key?.toString()?.trim()?.split(' ')?.[0] || '';
	if (searchKey) return encodeURIComponent(searchKey);
	return '';
};

const slugify = s => {
	const base = String(s || '')
		.toLowerCase()
		.replace(/[^a-z-\d\s-]+/g, ' ')
		.trim()
		.replace(/\s+/g, '-')
		.slice(0, 80);
	return base || 't';
};

const getTopicUrl = (tid, title, tamilMvUrl) =>
	`${String(tamilMvUrl || '').replace(/\/$/, '')}/index.php?/forums/topic/${tid}-${slugify(title)}/`;

// GET / - Manager Settings Page
router.get('/', async (request, response, next) => {
	try {
		const loadSettings = await getConfig();
		if (!loadSettings) return response.status(500).send('Configuration unavailable');
		response.render('index', {
			...GLOBAL_SETTINGS,
			tamilmv_url: loadSettings.tamilmvUrl,
			custom_search_keyword: loadSettings.custom_search_keyword,
			customSearchOn: !!loadSettings.custom_search,
			customSearchOff: !loadSettings.custom_search,
			tryUrl: `/api?t=${encodeURIComponent(loadSettings.custom_search_keyword || 'movie')}`,
		});
	} catch (error) { next(error); }
});

router.post('/', async (request, response, next) => {
	try {
		await updateConfig({
			tamilmvUrl: request.body.tamilmv_url,
			customSearch: request.body.custom_search_toggle === '1',
			customSearchKeyword: request.body.custom_search,
		});
		response.redirect('/');
	} catch (error) { next(error); }
});

router.get('/api', async (request, response, next) => {
	try {
		const config = await getConfig();
		const query = request.query.t || config?.custom_search_keyword || 'movie';
		const results = await searchMovies(query, config?.tamilmvUrl);
		const torrents = await scrapTorrents(results, config?.tamilmvUrl);
		response.type('application/rss+xml').send(createRssFeed(torrents));
	} catch (error) { next(error); }
});

router.get('/api?t=caps', (request, response) => response.type('application/xml').send(torznabTest()));

router.get('/torznab', async (request, response, next) => {
	try {
		const action = request.query.t;
		if (action === 'caps') return response.type('application/xml').send(torznabTest());
		if (action === 'search') {
			const config = await getConfig();
			const query = request.query.q || config?.custom_search_keyword || 'movie';
			const results = await searchMovies(query, config?.tamilmvUrl);
			const torrents = await scrapTorrents(results, config?.tamilmvUrl);
			return response.type('application/rss+xml').send(createRssFeed(torrents));
		}
		return response.status(400).send('Unsupported Torznab action');
	} catch (error) { next(error); }
});

router.get('/health', (request, response) => response.json({status:'ok',version:VERSION}));

export default router;
