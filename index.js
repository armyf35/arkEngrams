const DEBUG = false;

const request = require('request-promise');
const cheerio = require('cheerio');
const fs = require('fs');

const baseUrl = 'http://ark.gamepedia.com';
const levelUrl = `${baseUrl}/Levels`;
const engramsUrl = `${baseUrl}/Engrams`;
const requestOptions = uri => ({
  uri,
  transform(body) {
    return cheerio.load(body);
  },
});

const loadLevels = () => request(requestOptions(levelUrl))
  .then(($) => {
    const levels = {};
    const headers = [];
    const $levelTable = $('#Character_Levels').parent().next();

    const $levelData = $levelTable.find('tr');
    $levelData.each((i, currEle) => {
      const currLevelData = $(currEle)
        .text()
        .split('\n')
        .filter(ele => ele !== '')
        .map(ele => ele.trim());

      if (i === 0) {
        currLevelData.forEach(header => headers.push(header));
      } else {
        const currLevelObj = {};
        headers.forEach((header, index) => {
          currLevelObj[header] = parseInt(currLevelData[index], 10);
        });
        levels[currLevelObj[headers[0]]] = currLevelObj;
      }
    });

    if (DEBUG) console.log(levels);
    return levels;
  });

const loadEngrams = () => request(requestOptions(engramsUrl))
  .then(($) => {
    const engrams = {};
    const tables = [];
    $('.mw-headline:contains("List of Engrams to unlock")')
      .each((i, ele) => tables.push(`#${$(ele).attr('id')}`));


    tables.forEach(tableId => {
      const $engramsTable = $(tableId).parent().next();
      const $engramLevelTables = $engramsTable.find('table');
      $engramLevelTables.each((i, currTable) => {
        let headers = [];
        const $currTable = $(currTable);
        $currTable.find('tr').each((index, currRow) => {
          const $currRow = $(currRow);
          if (index === 0) {
            headers = $currRow.text().split('\n').filter(ele => ele !== '').map(ele => ele.trim());
          } else {
            const currEngram = {
              dlc: (() => {
                const dlc = tableId.indexOf('DLC');
                if (dlc > -1) {
                  return tableId.slice(dlc + 4);
                }

                return false;
              })(),
            };

            $currRow.find('td').each((colIndex, currEle) => {
              const $currEle = $(currEle);
              if (headers[colIndex] === 'Engram Name') {
                currEngram.url = `${baseUrl}${$currEle.find('a').attr('href')}`;
              }
            });

            engrams[currEngram.url] = currEngram;
          }
        });
      });
    });

    if (DEBUG) console.log(engrams);
    return engrams;
  });

const loadItemData = itemUrl => {
  const itemData = {
    url: itemUrl,
  };

  return request(requestOptions(itemUrl))
  .then(($) => {
    itemData.name = $('.infobox-header')
      .text()
      .trim();

    itemData.level = parseInt($('tr th:contains("Required level")')
      .next()
      .children()
      .remove()
      .end()
      .text());

    itemData.engramPoints = parseInt($('tr th:contains("Engram Points")')
      .next()
      .children()
      .remove()
      .end()
      .text());

    prerequisites = [];
    $('tr th:contains("Prerequisites")')
      .next()
      .find('a:not(".image")')
      .each((i, ele) => {
        prerequisites.push(`${baseUrl}${$(ele).attr('href')}`);
      });
    itemData.prerequisites = prerequisites;

    return loadImageUrl(`${baseUrl}${$('.infobox-centered').first().find('a').attr('href')}`);
  }).then((imageUrl) => {
    itemData.image = imageUrl;

    if (DEBUG) console.log(itemUrl, itemData);
    return itemData;
  });
}

const loadImageUrl = imageUrl => request(requestOptions(imageUrl))
  .then($ => $('.fullMedia a').attr('href'));

const loadAll = () => {
  const engrams = {};

  return loadEngrams()
    .then((currEngrams) => {
      Object.assign(engrams, currEngrams);

      return Promise.all(Object.keys(engrams).map(engram => loadItemData(engram)));
    })
    .then(engramsData => {
      engramsData.forEach((item) => {
        // item.prerequisites.forEach((prereq, index) => {
        //   item.prerequisites[index] = engrams[prereq];
        // });
        Object.assign(engrams[item.url], item);
      });

      return engrams;
    });
}
// loadEngrams()
//   .then(currEngrams => Promise.all(Object.keys(engrams).map(engram => loadItemData(engram))))
//   .then(engramsData => {
//     engramsData.forEach(item => {
//       item.prerequisites.forEach((prereq, index) => {
//         item.prerequisites[index] = engramsData[prereq];
//       });
//       Object.assign(engramsData[item.url], item);
//     });
//
//     return engramsData;
//   })
//   .then(result => console.log(result));

loadAll()
  .then((result) => {
    // console.log(result);
    // console.log(Object.keys(result).length);
    // console.log(result[Object.keys(result).pop()]);
    // console.log(result['http://ark.gamepedia.com/Rocket_Launcher']);
    // console.log(result['http://ark.gamepedia.com/Rocket_Propelled_Grenade']);

    // return new Promise((resolve, reject) => {
    //   fs.writeFile('output.json', JSON.stringify(result), (err) => {
    //     if (err) reject(err);
    //     resolve();
    //   });
    // });

    // return new Promise((resolve, reject) => {
    //   const output = 'output.csv'
    //   const props = Object.keys(result);
    //   const headers = Object.keys(result[props[0]]);
    //
    //   if (fs.existsSync(output)) {
    //     fs.unlinkSync(output);
    //   };
    //
    //   headers.forEach((header, index) => {
    //     if (index !== headers.length - 1) {
    //       fs.appendFileSync(output, `${header}, `);
    //     } else {
    //       fs.appendFileSync(output, `${header}\n`);
    //     }
    //   });
    //
    //   props.forEach((url) => {
    //     const currItem = result[url];
    //
    //     headers.forEach((header, index) => {
    //       if (index !== headers.length - 1) {
    //         fs.appendFileSync(output, `${currItem[header]}, `);
    //       } else {
    //         fs.appendFileSync(output, `${currItem[header]}\n`);
    //       }
    //     });
    //   });
    //
    //   resolve();
    // });
  })
  .then((result) => {
    console.log('Finished');
  });
// loadEngrams()
//   .then(engrams => console.log(engrams));
// loadEngrams().then(console.log);
// module.exports {
//   loadLevels,
//   loadEngrams,
//
// }
//
// let tempLevels = {};
// let tempEngrams = {};
// loadLevels()
//   .then((levels) => {
//     tempLevels = levels;
//     return loadEngrams();
//   })
//   .then(engrams => {
//     tempEngrams = engrams;
//
//     return Promise.all(Object.keys(tempEngrams).map(engram => loadItemData(engram)));
//   })
//   .then((data) => {
//     data.forEach(item => {
//       item.prerequisites.forEach((prereq, index) => {
//         item.prerequisites[index] = tempEngrams[prereq];
//       });
//       Object.assign(tempEngrams[item.url], item);
//     });
//
//     console.log(tempEngrams);
//   });
