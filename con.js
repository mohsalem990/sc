var program = require('commander');

program
  .option('-h, --host <value>', 'VPN Server Address')
  .option('-u, --user <value>', 'Username')
  .option('-p, --pass <value>', 'Password')
  .parse(process.argv);

console.log('Dialing PPTP', program.user,'@', program.host);

//=== Prepare option files
var fs = require('fs');
fs.appendFileSync('/etc/ppp/chap-secrets', program.user + ' target ' + program.pass + ' *');
var pptp_opts = 'pty \"pptp ' + program.host + ' --nolaunchpppd\"\nlock\nnoauth\nnobsdcomp\nnodeflate\nname ' + program.user + '\nremotename target\nipparam target\nrequire-mppe-128';
fs.writeFileSync('/etc/ppp/peers/target', pptp_opts);

//=== dial PPPD
var exec = require('child_process').exec;
var pppCallProcess = exec('pppd call target'
  , function (error, stdout, stderr) {
      if (error !== null) {
        console.log('exec error: ' + error);
        process.exit(1);
      }
  });

var num_tries = 10;
var tmrConnectVPN = setInterval(function(){
  exec('ip addr | grep ppp0'
  , function (error, stdout, stderr) {
      var result = '' + stdout;
      if (result.indexOf('inet ') > 0) {
        clearInterval(tmrConnectVPN);

//=== set up ip route
        exec('route add default dev ppp0', function (error, stdout, stderr) {

          console.log('VPN Connected.\r\n', result);

        });
      } else {
        num_tries--;
        if (num_tries <= 0) {
          process.exit(1);
        }
      }
  });
}, 1000);
