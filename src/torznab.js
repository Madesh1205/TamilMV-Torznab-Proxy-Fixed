import {create} from 'xmlbuilder2';

const noTopics = () => create({version:'1.0', encoding:'UTF-8'}).ele('rss',{version:'2.0'}).ele('channel').ele('title').txt('TamilMV').up().up().end({prettyPrint:true});

export function torznabTest() {
	return create({version:'1.0', encoding:'UTF-8'}).ele('caps')
		.ele('server',{version:'1.0.0',title:'TamilMV Torznab Proxy'}).up()
		.ele('limits',{max:'100'}).up()
		.ele('searching').ele('search',{available:'yes',supportedParams:'q'}).up()
		.ele('tv-search',{available:'no'}).up()
		.ele('movie-search',{available:'yes',supportedParams:'q'}).up()
		.up().end({prettyPrint:true});
}

export function createRssFeed(items = []) {
	const root=create({version:'1.0',encoding:'UTF-8'}).ele('rss',{version:'2.0',xmlns: 'http://torznab.com/schemas/2015/feed'});
	const channel=root.ele('channel');
	channel.ele('title').txt('TamilMV').up();
	for (const item of items) {
		const node=channel.ele('item');
		node.ele('title').txt(item.title || '').up();
		node.ele('guid').txt(item.guid || item.link || '').up();
		node.ele('link').txt(item.link || '').up();
		node.ele('pubDate').txt(item.pubDate || new Date().toUTCString()).up();
		node.ele('enclosure',{url:item.link || '',length:item.size || '0',type:'application/x-bittorrent'}).up();
		node.ele('torznab:attr',{name:'category',value:'2000'});
	}
	return root.end({prettyPrint:true});
}

export { noTopics };
