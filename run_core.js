const { fetchMoviesPage, fetchMovieDetails } = require('./app/api/modlist/core.js') || {};

async function run() {
  if(!fetchMovieDetails) {
     console.log('Needs compiling or direct test without TS.');
  }
}
run();
