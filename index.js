const exporess = require('express');
const config = require('config');
const fetch = require('node-fetch');
const app = exporess();

app.disable('x-powered-by'); 

app.use(require('cors')({ origin: "*" }));

app.use(function(req, res, next) {
    req.body = '';
    req.setEncoding('utf8');

    req.on('data', function(chunk) { 
        req.body += chunk;
    });

    req.on('end', function() {
        next();
    });
});

app.all('/:serviceId/*', async (req, res) => {
    try {
        let requestUrl = null;
        const redirect = config.get('redirects.' + req.params.serviceId);

        if(redirect != null) {
            requestUrl = redirect;
        } else {
            requestUrl = config.get('redirects.default');
        }

        console.log(req.method + " " + requestUrl + ' [' + req.params['0'] + ']')

        const response = await fetch(
            requestUrl + '/' + req.params['0'],
            {
                method: req.method,
                headers: { ...req.headers, host: 'proxy.burmistr.ru' },
                body: !['GET', 'HEAD'].includes(req.method) ? req.body : undefined
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