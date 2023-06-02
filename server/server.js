const app = require('.');

app.listen(3000, () => {
  console.log(`LISTENING ON PORT ${process.env.PORT}`);
});
