import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import {KEYWORDS_TO_EXCLUDE} from './config.js';

const normalizeBaseUrl = value => String(value || '').trim().replace(/\/+$/, '');

export async function searchMovies(query, tamilMvUrl) {
	const base = normalizeBaseUrl(tamilMvUrl);
	if (!base) throw new Error('TamilMV base URL is not configured');
	const url = `${base}/index.php?/search/${encodeURIComponent(query)}`;
	const response = await fetch(url, {headers:{'User-Agent':'Mozilla/5.0'}});
	if (!response.ok) throw new Error(`Search request failed: HTTP ${response.status}`);
	const html = await response.text();
	const $ = cheerio.load(html);
	const items = [];
	$('a[href*="/forums/topic/"]').each((_, element) => {
		const href = $(element).attr('href');
		const title = $(element).text().trim();
		if (href && title) items.push({href:new URL(href, base).toString(),title});
	});
	const unique = new Map(items.map(item=>[item.href,item]));
	return [...unique.values()];
}

export async function scrapTorrents(topics, tamilMvUrl) {
	const base = normalizeBaseUrl(tamilMvUrl);
	const results=[];
	for (const topic of (topics || [])) {
		try {
			const url = new URL(topic.href, base).toString();
			const response = await fetch(url,{headers:{'User-Agent':'Mozilla/5.0'}});
			if (!response.ok) continue;
			const html=await response.text();
			const $=cheerio.load(html);
			$('a[href*=".torrent"], a[href*="magnet:"]').each((_, element)=>{
				const link=$(element).attr('href');
				const title=$(element).text().trim() || topic.title;
				if (!link || KEYWORDS_TO_EXCLUDE.some(keyword=>title.toLowerCase().includes(keyword.toLowerCase()))) return;
				results.push({title,link:new URL(link,url).toString(),guid:new URL(link,url).toString()});
			});
		} catch (error) {
			console.warn('Unable to scrape topic:',topic.href,error.message);
		}
	}
	return results;
}

export function hasNonEnglishCharacters(value) {
	return /[^\u0000-\u007f]/.test(String(value || ''));
}
