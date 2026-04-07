class Vector2{
    x; y;
    constructor (x, y) {
        this.x = x;
        this.y = y;
    }
    sub(that) {return {x: this.x - that.x, y: this.y - that.y}}

    add(that) {
        return new Vector2(this.x + that.x, this.y + that.y)
    }
    scale(that) {return new Vector2(this.x * that,  this.y * that)}
    unit_vector_on_dir(dir){
        return new Vector2(
            this.x + Math.cos(dir),
            this.y + Math.sin(dir)
        )
    }
    rotate(deg){
        let c = Math.cos(deg);
        let s = Math.sin(deg);
        let x = this.x; 
        let y = this.y; 
        return new Vector2(
            x*c - y*s, x*s + y*c
        )
    }
    dist_sq(that){return ((that.y - this.y)**2) + ((that.x - this.x)**2)};
}
class Player {
    position;
    dir;
    fov = Math.PI/2;
    velocity = new Vector2(0, 0);
    normal_speed = 0.08;
    constructor (position, dir){
        this.position = position;
        this.dir = dir;
    }
}

const ctx = canvas.getContext("2d");
canvas.width = innerWidth - 100;
canvas.height = innerHeight - 100;
let COLS = 10;
let ROWS = 10;
const TILE_W = canvas.width / COLS
const TILE_H = canvas.height / ROWS;
let STATE = {
    keys: {
        a: false, 
        d: false,
        arrowleft: false,
        arrowright: false,
        arrowup: false,
        arrowdown: false,
    }
};

function draw_circle(p1, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p1.x, p1.y, 0.08, 0, Math.PI*2);
    ctx.closePath();
    ctx.fill();
}

function draw_line(p1, p2, color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y); 
    ctx.stroke();
}
function cast_ray(orig, angle){
    let pos = {...orig};
    let dx = Math.cos(angle);
    let dy = Math.sin(angle);
    for(let i = 0; i < 10000;i++){
        pos.x += dx * 0.01;
        pos.y += dy * 0.01;
        let row_index = Math.floor(pos.y);
        let col_index = Math.floor(pos.x);
        if(row_index < 0 || col_index < 0 || ROWS <= row_index || COLS <= col_index){
            return {pos, dist: orig.dist_sq(pos), wall: false};
            break;
        }
        let next_block = STATE.Scene[row_index][col_index];
        if(next_block != 0) {
            return {pos, dist: orig.dist_sq(pos), wall: next_block};
            break;
        }
    }
    return null;
}
addEventListener("keyup", (e) => {
    if(Object.keys(STATE.keys).includes(e.key.toLowerCase())) STATE.keys[e.key.toLowerCase()] = false;
    switch(e.key){
        case "ArrowUp":
        case "ArrowDown":
        case "ArrowLeft":
        case "ArrowRight":
            STATE.Player.velocity.x = 0;
            STATE.Player.velocity.y = 0;
            break;
    }
});
addEventListener("keydown", (e) => {
    const Player = STATE.Player;
    if(Object.keys(STATE.keys).includes(e.key.toLowerCase())) STATE.keys[e.key.toLowerCase()] = true;
});

function minimap(w, h){
    ctx.save()
    ctx.scale(w/COLS, h/ROWS);
    ctx.lineWidth = 0.03;

    let Player = STATE.Player;
    for(let i = 0; i <= COLS; i++){
        draw_line({x: i, y: 0}, {x: i, y: ROWS}, "red");
        draw_line({x: 0, y: i}, {x: COLS, y: i}, "red");
    }
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, COLS, ROWS);
    draw_line(Player.position, Player.position.add(Player.velocity.rotate(Player.dir + Math.PI/2).scale(10)), "blue")
    Player.position = Player.position.add(Player.velocity.rotate(Player.dir + Math.PI/2));
    let P = STATE.Player;
    for(let row = 0; row < ROWS; ++row){
        for(let col = 0; col < COLS; ++col){
            ctx.fillStyle = "red";
            if(STATE.Scene[col][row]) ctx.fillRect(row, col, 1, 1);
        }
    }
    draw_circle(P.position, "red");
    draw_line(P.position, {
        x: P.position.x + Math.cos(P.dir - P.fov/2),
        y: P.position.y + Math.sin(P.dir - P.fov/2)
    })
    draw_line(P.position, {
        x: P.position.x + Math.cos(P.dir + P.fov/2),
        y: P.position.y + Math.sin(P.dir + P.fov/2)
    })
        STATE.ray_hits = [];
        for(let angle = P.dir - P.fov/2; angle < P.dir + P.fov/2; angle += 0.01) {
            let res = cast_ray(P.position, angle);
            res.dist = res.dist * Math.cos(angle-P.dir);
            if(res){
                STATE.ray_hits.push({angle, ...res})
            }
            else {
                throw new Error("Ray casting failed for some reason.")
            }
        }
    for(hit of STATE.ray_hits){
        draw_circle(hit.pos, "blue");  
    }
    ctx.restore();
}
function draw_scene(){
    for(let i = 0; i < STATE.ray_hits.length; i++){
        let hit = STATE.ray_hits[i];
        ctx.fillStyle = "brown";
        const wall_width = canvas.width / STATE.ray_hits.length;
        const x = wall_width * i; 
        if(hit.wall){
            ctx.fillStyle = hit.wall;
            const wall_height = 900/hit.dist;
            const wall_width = canvas.width / STATE.ray_hits.length;
            const y = canvas.height/2 - wall_height/2;
            ctx.fillRect(x, y, wall_width, wall_height);
        }
    }
}

let last_frame = 0;
function game_loop(ctime){
    if(ctime - last_frame > 40){
        ctx.fillStyle = 'rgb(20, 0, 20)';
        ctx.fillRect(0, 0, canvas.width, 300);  

        ctx.fillStyle = 'rgb(60, 0, 60)';
        ctx.fillRect(0, 300, canvas.width, 300);

        let Player = STATE.Player;
        for([key, value] of Object.entries(STATE.keys)){
            if(key == "arrowup" && value){
                Player.velocity.y = -Player.normal_speed;
            }
            if(key == "arrowdown" && value){
                Player.velocity.y = Player.normal_speed;
            }
            if(key == "arrowleft" && value){
                Player.velocity.x = -Player.normal_speed;
            }
            if(key == "arrowright" && value){
                Player.velocity.x = Player.normal_speed;
            }
            if(key == "a" && value){
                Player.dir-=0.06;
            }
            if(key == "d" && value){
                Player.dir += 0.06;
            }
        }

        last_frame = ctime;
        draw_scene();
        minimap(150, 150)
    }
    requestAnimationFrame(game_loop)
}

function main(){
    STATE = {
        ...STATE,
        Scene: Array(ROWS).fill("").map(()=>Array(COLS).fill(0)),
        Player: new Player(new Vector2(Math.random()*10, Math.random()*10), 1e-3),
        ray_hits: [],
    }
    for(let i = 0; i < 10; ++i){
        const x = Math.floor(Math.random() * 9);
        const y = Math.floor(Math.random() * 9);
        STATE.Scene[y][x] = '#'+(Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0');
    }
    requestAnimationFrame(game_loop)
}
main();
