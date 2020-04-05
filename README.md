# ![](/docs/icon.png) Vue-Jeedom

[![license: AGPLv3](https://img.shields.io/badge/license-AGPLv3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![GitHub release](https://img.shields.io/github/release/nioc/vue-jeedom.svg)](https://github.com/nioc/vue-jeedom/releases/latest)
[![Build Status](https://travis-ci.org/nioc/vue-jeedom.svg?branch=master)](https://travis-ci.org/nioc/vue-jeedom)

Vue-Jeedom is a web front end for the home automation software [Jeedom](https://www.jeedom.com).

## Key features
-    display objects with summary,
-    display object with logical equipments,
-    user authentication with login and password (not stored in application)
-    communicate with your Jeedom through JSON-RPC API and [websocket](https://github.com/nioc/jeedom-websocket), authorized with user API key,
-    reduce data traffic,
-    responsive
-    progressive web app (offline access).

## Installation

For basic use, you just have to:
-    download [latest release](https://github.com/nioc/xmpp-web/releases/latest) archive,
-    unarchive in `/var/www/vue-jeedom/`,
-    add following lines in Apache virtual hosts `/etc/apache2/sites-enabled/default-ssl.conf` and `/etc/apache2/sites-enabled/000-default.conf`, inside `<VirtualHost>` section:
      ``` conf
              alias /vue-jeedom/ /var/www/vue-jeedom/
              <Directory /var/www/vue-jeedom>
                      Options -Indexes -FollowSymLinks -MultiViews -ExecCGI
                      AllowOverride none
                      Order allow,deny
                      allow from all
              </Directory>
      ```
-   set your Jeedom url in `/var/www/vue-jeedom/local.js`.

For more advanced use (adding your own component, style, ...), you have to follow the [contributing guide](CONTRIBUTING.md) and edit Vue code.

## Versioning

Vue-Jeedom is maintained under the [semantic versioning](https://semver.org/) guidelines.

See the [releases](https://github.com/nioc/vue-jeedom/releases) on this repository for changelog.

## Contributing

If you have a suggestion for a feature you think would enhance this product, please create a [ticket](https://github.com/nioc/vue-jeedom/issues).
Pull requests are welcomed. See [contributing](CONTRIBUTING.md).

## Credits

* **[Nioc](https://github.com/nioc/)** - *Initial work*

See also the list of [contributors](https://github.com/nioc/vue-jeedom/contributors) to this project.

This project is powered by the following components:
- [VueJS](https://vuejs.org/) (MIT)
- [Bulma](https://bulma.io/) (MIT)
- [Buefy](https://buefy.github.io) (MIT)
- [Font Awesome](https://github.com/FortAwesome/Font-Awesome/) (Font Awesome Free License)
- [axios](https://github.com/axios/axios ) (MIT)
- [normalizr](https://github.com/paularmstrong/normalizr) (MIT)
- [Chart.js](https://www.chartjs.org/) (MIT)
- [vue-chartjs](https://vue-chartjs.org/) (MIT)

## License

This project is licensed under the GNU Affero General Public License v3.0 - see the [LICENSE](LICENSE.md) file for details