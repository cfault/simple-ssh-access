module.exports = {
  getRole: (req, res, next) => {
    res.setHeader('content-type', 'application/json');
  	res.send([{
      payload: 'samplePayload',
      authoriser: 'sampleAuthoriser',
      ttl: 4000
    }]);
  	next();

  },
  getUsers: (req, res, next) => {
  	res.setHeader('content-type', 'application/json');
  	res.send(['a','b','c']);
  	next();
  }
}