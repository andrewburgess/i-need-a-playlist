# I Need A Playlist

Generate playlists based on other playlists

## External Dependencies

Running your own copy relies on [Neo4j](http://neo4j.com).

## Running

Make sure to install all of the dependencies

    npm install

After that, copy `config.example.js` to `config.js`. Update
`config.js` with options relative to your environment

## Configuration

These are the configuration options that you can use

    {
        server: {
            host: 'string', // Host name of your Neo4j instance
            port: 1234 // Port to use to connect to Neo4j
        },
        spotifyKey: [
            // Array of bytes, copied from your Spotify developer
            // account (the C code version)
        ]
    }
