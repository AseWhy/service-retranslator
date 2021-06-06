const exporess = require('express');
const config = require('config');
const fetch = require('node-fetch');
const app = exporess();

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

app.disable('x-powered-by'); 

app.use(require('cors')({ origin: "*" }));

app.use(function(req, res, next) {
    req.body = Buffer.from([]);

    req.on('data', function(chunk) { 
        req.body = Buffer.concat([ req.body, chunk ]);
    });

    req.on('end', function() {
        next();
    });
});

app.all('/:serviceId/*', async (req, res) => {
    try {
        let requestUrl = null;
        let queryParams = null;

        const redirect = config.has('redirects.' + req.params.serviceId) ? config.get('redirects.' + req.params.serviceId) : null;

        if(redirect != null) {
            requestUrl = redirect;
        } else {
            requestUrl = config.get('redirects.default') + '/' + req.params.serviceId;
        }

        if(Object.keys(req.query).length > 0) {
            queryParams = "?" + Object.keys(req.query).map(key => key + '=' + req.query[key]).join('&');
        }

        console.log(req.method + " " + requestUrl + ' [' + req.params['0'] + (queryParams ?? '') + ']')

        const response = await fetch(
            requestUrl + '/' + req.params['0'] + (queryParams ?? ''),
            {
                method: req.method.toString(),
                headers: { ...req.headers, host: 'local.burmistr.ru' },
                body: !['GET', 'HEAD'].includes(req.method.toString()) ? req.body : undefined
            }
        );
        const response_header = Object.fromEntries(Object.entries(response.headers.raw()).map(([key, value]) => [key, value.join('')]));

        for(let key in response_header) {
            if(key == 'content-encoding') {
                continue;
            }

            res.setHeader(key, response_header[key]);
        }
        
        res.status(response.status);
        res.end(await response.buffer());
    } catch (e) {
        console.log(e);
    }
});

app.listen(config.get('server.port'));