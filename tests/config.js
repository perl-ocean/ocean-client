exports.config = {
    client_opts: {
        // Address of a ocean test server.
        url: 'http://localhost:8081',
        ocean_opts: {
            devel: true,
            debug: true,
            // websocket:false
            info: {cookie_needed:false}
        }
    },

    port: 8080,
    host: '0.0.0.0'
};
