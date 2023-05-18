const canvas = document.querySelector('#game');
const context = canvas.getContext('2d');

const grid = 64;
const numRows = 13;
const numCols = 15;

const softWallCanvas = document.createElement('canvas');
const softWallCtx = softWallCanvas.getContext('2d');
softWallCanvas.width = softWallCanvas.height = grid;

softWallCtx.fillStyle = 'black';
softWallCtx.fillRect(0, 0, grid, grid);
softWallCtx.fillStyle = '#a9a9a9';

softWallCtx.fillRect(1, 1, grid - 2, 20);
softWallCtx.fillRect(0, 23, 20, 18);
softWallCtx.fillRect(22, 23, 42, 18);
softWallCtx.fillRect(0, 43, 42, 20);
softWallCtx.fillRect(44, 43, 20, 20);

const wallCanvas = document.createElement('canvas');
const wallCtx = wallCanvas.getContext('2d');
wallCanvas.width = wallCanvas.height = grid;

wallCtx.fillStyle = 'black';
wallCtx.fillRect(0, 0, grid, grid);
wallCtx.fillStyle = 'white';
wallCtx.fillRect(0, 0, grid - 2, grid - 2);
wallCtx.fillStyle = '#a9a9a9';
wallCtx.fillRect(2, 2, grid - 4, grid - 4);

const types = {
    wall: "▉",
    softWall: 1,
    bomb: 2
};

let cells = [];
const template = [
    ['▉','▉','▉','▉','▉','▉','▉','▉','▉','▉','▉','▉','▉','▉','▉'],
    ['▉','x','x',   ,   ,   ,   ,   ,   ,   ,   ,   ,'x','x','▉'],
    ['▉','x','▉',   ,'▉',   ,'▉',   ,'▉',   ,'▉',   ,'▉','x','▉'],
    ['▉','x',   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,'x','▉'],
    ['▉',   ,'▉',   ,'▉',   ,'▉',   ,'▉',   ,'▉',   ,'▉',   ,'▉'],
    ['▉',   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,'▉'],
    ['▉',   ,'▉',   ,'▉',   ,'▉',   ,'▉',   ,'▉',   ,'▉',   ,'▉'],
    ['▉',   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,'▉'],
    ['▉',   ,'▉',   ,'▉',   ,'▉',   ,'▉',   ,'▉',   ,'▉',   ,'▉'],
    ['▉','x',   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,   ,'x','▉'],
    ['▉','x','▉',   ,'▉',   ,'▉',   ,'▉',   ,'▉',   ,'▉','x','▉'],
    ['▉','x','x',   ,   ,   ,   ,   ,   ,   ,   ,   ,'x','x','▉'],
    ['▉','▉','▉','▉','▉','▉','▉','▉','▉','▉','▉','▉','▉','▉','▉']
];

let entities = [];

function generateLevel() {
    cells = [];

    for (let row = 0; row < numRows; row++) {
        cells[row] = [];
        
        for(let col = 0; col < numCols; col++) {
            if(!template[row][col] && Math.random() < 0.90) {
                cells[row][col] = types.softWall;
            } else if(template[row][col] === types.wall) {
                cells[row][col] = types.wall;
            }
        }
    }
}
const player = {
    row: 1,
    col: 1,
    numBombs: 1,
    bombSize: 3,
    radius: grid * 0.35,

    render() {
        const x = (this.col + 0.5) * grid;
        const y = (this.row + 0.5) * grid;

        context.save();
        context.fillStyle = 'white';
        context.beginPath();
        context.arc(x, y, this.radius, 0, 2 * Math.PI);
        context.fill();
    }
}
function Bomb(row, col, size) {
    this.row = row;
    this.col = col;
    this.radius = grid * 0.4;
    this.size = size;
    this.alive = true;
    this.type = types.bomb;
    this.timer = 3000;
    this.update = function (dt) {
        this.timer -= dt;

        if (this.timer <= 0) {
            return blowUpBomb(this);
        }

        const interval = Math.ceil(this.timer / 500);
        if (interval % 2 === 0) {
            this.radius = grid * 0.4;
        } else {
            this.radius = grid * 0.5;
        }
    };

    this.render = function () {
        const x = (this.col + 0.5) * grid;
        const y = (this.row + 0.5) * grid;

        context.fillStyle = 'black';
        context.beginPath();
        context.arc(x, y, this.radius, 0, 2 * Math.PI);
        context.fill();

        const fuseY = (this.radius === grid * 0.5 ? grid * 0.15 : 0);
        context.strokeStyle = 'white';
        context.lineWidth = 5;
        context.beginPath();
        context.arc(
            (this.col + 0.75) * grid,
            (this.row + 0.25) * grid - fuseY,
            10, Math.PI, -Math.PI / 2
        );
        context.stroke();
    };
}
function Explosion(row, col, dir, center) {
    this.row = row;
    this.col = col;
    this.dir = dir;
    this.alive = true;
    this.timer = 300;
    this.update = function (dt) {
        this.timer -= dt;

        if (this.timer <= 0) {
            this.alive = false;
        }
    };

    this.render = function () {
        const x = this.col * grid;
        const y = this.row * grid;
        const horizontal = this.dir.col;
        const vertical = this.dir.row;

        context.fillStyle = '#D72B16';
        context.fillRect(x, y, grid, grid); //red

        context.fillStyle = '#F39642';
        if (center || horizontal) {
            context.fillRect(x, y + 6, grid, grid - 12);
        }
        if (center || vertical) {
            context.fillRect(x + 6, y, grid - 12, grid);
        } // orange
        context.fillStyle = '#FFE5A8';
        if (center || horizontal) {
            context.fillRect(x, y + 12, grid, grid - 24);
        }
        if (center || vertical) {
            context.fillRect(x + 12, y, grid - 24, grid);
        } // yellow
    };
}

function blowUpBomb(bomb) {
    if(!bomb.alive) return;

    bomb.alive = false;

    cells[bomb.row][bomb.col] = null;

    const dirs = [{
        // up
        row: -1,
        col: 0
    }, {
        // down
        row: 1,
        col: 0
    }, {
        // left
        row: 0,
        col: -1
    }, {
        // right
        row: 0,
        col: 1
    }];

    dirs.forEach((dir) => {
        for (let i = 0; i < bomb.size; i++) {
            const row = bomb.row + dir.row * i;
            const col = bomb.col + dir.col * i;
            const cell = cells[row][col];

            if (cell === types.wall) {
                return;
            }
            entities.push(new Explosion(row, col, dir, i === 0 ? true: false));
            cells[row][col] = null;

            if(cell === types.bomb) {
                const nextBomb = entities.find((entity) => {
                    return (
                        entity.type === types.bomb &&
                        entity.row === row && entity.col === col
                    );
                });
                blowUpBomb(nextBomb);
            }

            if (cell) {
                return;
            }
        }
    });
}
document.addEventListener('keydown', function(event) {
    let row = player.row;
    let col = player.col;

    if (event.which === 37) { // move to left
        col--;
    } else if (event.which === 38) { //move to up
        row--;
    } else if (event.which === 39) { // move to right
        col++;
    } else if (event.which === 40) { // move to down
        row++;
    } else if ( //bomb planting
        event.which === 32 && !cells[row][col] &&
        entities.filter((entity) => {
            return entity.type === types.bomb && entity.owner === player
        }).length < player.numBombs
    ) {
        const bomb = new Bomb(row, col, player.bombSize, player);
        entities.push(bomb);
        cells[row][col] = types.bomb;
    }

    if(!cells[row][col]) {
        player.row = row;
        player.col = col;
    }
});

let last;
let dt;
function loop(timestamp) {
    requestAnimationFrame(loop);
    context.clearRect(0, 0, canvas.width, canvas.height)

    if (!last) {
        last = timestamp;
    }
    dt = timestamp - last;
    last = timestamp;

    for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
            switch(cells[row][col]) {
                case types.wall:
                    context.drawImage(wallCanvas, col * grid, row * grid);
                    break;
                case types.softWall:
                    context.drawImage(softWallCanvas, col * grid, row * grid);
                    break;
            }
        }
    }

    entities.forEach((entity) => {
        entity.update(dt);
        entity.render();
    });
    entities = entities.filter((entity) => entity.alive);
    player.render();

}
generateLevel();
requestAnimationFrame(loop);