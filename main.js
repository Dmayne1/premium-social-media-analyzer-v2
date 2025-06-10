const { Actor } = require('apify');
const { CheerioCrawler } = require('crawlee');

Actor.main(async () => {
    console.log('🚀 Starting Premium Social Media Analytics Platform');
    
    const input = await Actor.getInput() || {};
    const {
        startUrls = [],
        maxItems = 1000,
        enableAnalytics = true,
        proxyConfiguration
    } = input;

    if (!startUrls || startUrls.length === 0) {
        throw new Error('❌ Please provide at least one URL to analyze.');
    }

    console.log(`📊 Processing ${startUrls.length} URLs with premium analytics`);
    
    const proxyConfig = await Actor.createProxyConfiguration(proxyConfiguration);
    let totalProcessed = 0;
    let successfulExtractions = 0;
    const startTime = Date.now();

    const crawler = new CheerioCrawler({
        proxyConfiguration: proxyConfig,
        maxRequestsPerCrawl: maxItems,
        requestHandlerTimeoutSecs: 60,
        maxRequestRetries: 3,
        
        requestHandler: async ({ $, request, log }) => {
            try {
                log.info(`Analyzing: ${request.url}`);
                
                const extractedData = {
                    url: request.url,
                    title: $('title').text().trim(),
                    headings: $('h1, h2, h3').map((i, el) => $(el).text().trim()).get(),
                    links: $('a').length,
                    images: $('img').length,
                    content: $('body').text().substring(0, 5000).trim(),
                    metaDescription: $('meta[name="description"]').attr('content') || '',
                    timestamp: new Date().toISOString()
                };

                if (enableAnalytics) {
                    extractedData.analytics = {
                        contentLength: extractedData.content.length,
                        readingTime: Math.ceil(extractedData.content.split(' ').length / 200),
                        hasMetaDescription: !!extractedData.metaDescription,
                        headingStructure: extractedData.headings.length,
                        mediaRichness: extractedData.images / Math.max(extractedData.links, 1)
                    };
                }

                extractedData.metadata = {
                    scrapedAt: new Date().toISOString(),
                    scraperVersion: '2.0.0',
                    premium: true
                };

                await Actor.pushData([extractedData]);
                successfulExtractions++;
                log.info(`✅ Data extracted from ${request.url}`);
                
            } catch (error) {
                log.error(`❌ Failed to process ${request.url}:`, error.message);
            }
            
            totalProcessed++;
        }
    });

    await crawler.addRequests(startUrls.map(url => ({ url })));
    await crawler.run();
    
    const report = {
        totalProcessed,
        successfulExtractions,
        successRate: (successfulExtractions / totalProcessed) * 100,
        duration: Date.now() - startTime
    };
    
    await Actor.setValue('EXECUTION_REPORT', report);
    console.log(`🎉 Completed! Processed ${totalProcessed} items, ${successfulExtractions} successful`);
});