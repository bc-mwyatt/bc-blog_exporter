const fs = require('fs');
const csv = require('fast-csv');
const BigCommerce = require('./BC');

class BlogPosts {
    constructor(rate = 1) {
        this.bc = BigCommerce;
        this.Streams = {};
        this.state = {
            totalPages: 0,
            queue: [],
            rate: rate,
            startTime: 0
        };
    }

    CreateCSVFile() {
        const date = new Date().toDateString().split(' ').join('_');
        const filename = `blogpost-export-${date}.csv`;
        return filename;
    }

    InitExportStream() {
        const filename = this.CreateCSVFile();
        const writableStream = fs.createWriteStream(filename);
        const csvStream = csv.format({headers: true});
        csvStream.pipe(writableStream);

        const Streams = {
            writableStream: writableStream,
            csvStream: csvStream,
            filename: filename
        }
        return Streams;
    }

    InitExport() {
        this.state.startTime = Date.now();
        this.Streams = this.InitExportStream();
        this.GetAllBlogPosts();
    }

    BlogPostCount() {
        return this.bc.get(`/blog/posts/count`);
    }

    CountPages() {
        return (async () => {
            const { count } = await this.BlogPostCount();
            return Math.ceil(count / 250);
        })();
    }

    GetPage(page) {
        return this.bc.get(`/blog/posts?limit=250&page=${page}`);
    }

    GetAllBlogPosts() {
        this.CountPages()
        .then(this.PrepareQueue.bind(this))
    }

    /**
     * Create a new generator that increments 1 at a time until the total is reached
     * @param {Number} total - The total number of iterations
     */
    SpawnGenerator(total) {
        function* generator(total) {
            for (let i = 0; i < total; i++) {
                yield i;
            }
        }

        return generator(total);
    }

    /**
     * Sets up the API request queue based on the total number of pages
     * @param {Number} pages
     */
    PrepareQueue(pages) {
        this.state.totalPages = pages;
        for (let pageNumber = 1; pageNumber < pages + 1; pageNumber++) {
            this.state.queue.push(pageNumber);
        }
        return this.SetupRequestBlock();
    }

    /**
     * Create a block of page numbers from the queue to request over the API
     */
    SetupRequestBlock() {
        const block = this.state.queue.splice(0, this.state.rate);
        const start = block[0];
        const end = block[block.length - 1] + 1;
        console.log('Queue:', this.state.queue);
        console.log('Page(s) being requested:', block);

        const requestGroup = [];
        for (let index = start; index < end; index++) {
            requestGroup.push(this.GetPage(index))
        }

        if (block.length) {
            return this.ExecuteAPIRequests(requestGroup);
        } else {
            const finishTime = Date.now();
            console.log(`Time elapsed: ${Math.floor(finishTime - this.state.startTime) / 1000} seconds`);
        }
        
    }

    async ExecuteAPIRequests(requestGroup) {
        try {
            const blogPages = await Promise.all(requestGroup);
            return this.WriteEachResultToCSV(blogPages);
        } catch(err) {
            console.log('Error executing requests: ',err)
        }
    }

    /**
     * Iterate over the pages of responses and write them to a CSV
     * @param {Object[]} pagesOfBlog - Collection of arrays, each array containing a page of blog posts from the API
     */
    WriteEachResultToCSV(pagesOfBlog) {
        const total = pagesOfBlog.length;
        const generator = this.SpawnGenerator(total);

        return this.CyclePages(generator, pagesOfBlog);
    }
    /**
     * Recursively called to write each page returned by API to a CSV file
     * @param {Object} generator - A generator that increments 1 at a time
     * @param {Object[]} pagesOfBlog
     */
    CyclePages(generator, pagesOfBlog) {
        const cycle = generator.next();

        if (!cycle.done) {
            const currentBlogPage = cycle.value;
            let counter = 0;
            pagesOfBlog[currentBlogPage].forEach((blog, _, page) => {
                this.WriteToCSV(blog);
                counter++;
                if (counter == page.length) {
                    this.CyclePages(generator, pagesOfBlog);
                }
            });
        } else {
            this.SetupRequestBlock();
        }
    }

    WriteToCSV(blog) {
        this.Streams.csvStream.write(this.FormatExportContent(blog));
    }
    /**
     * Takes a blog post returned from API and formats it for CSV. Object keys are used as CSV headers.
     * @param {Object} blog - A Blog Post returned from the API
     */
    FormatExportContent(blog) {
        return {
            'BlogPosts ID': parseInt(blog['id']),
            'Title': blog['title'],
            'URL': blog['url'],
            'Body': blog['body'],
            'Tags': blog['tags'],
            'Summary': blog['summary'],
            'Is Published': blog['is_pubished'],
            'Published Date': blog['published_date'].date,
            'Published Date ISO': blog['published_date_iso8601'],
            'Meta Description': blog['meta_description'],
            'Meta Keywords': blog['meta_keywords'],
            'Author': blog['author'],
            'Thumbnail Path': blog['thumbnail_path'],
        };
    }

}

module.exports = BlogPosts;