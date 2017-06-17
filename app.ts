/// <reference path="scripts/typings/box2d/index.d.ts" />
/// <reference path="wheelScript.ts" />

import b2Vec2 = Box2D.Common.Math.b2Vec2;
import b2BodyDef = Box2D.Dynamics.b2BodyDef;
import b2Body = Box2D.Dynamics.b2Body;
import b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
import b2Fixture = Box2D.Dynamics.b2Fixture;
import b2World = Box2D.Dynamics.b2World;
import b2MassData = Box2D.Collision.Shapes.b2MassData;
import b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
import b2CircleShape = Box2D.Collision.Shapes.b2CircleShape;
import b2DebugDraw = Box2D.Dynamics.b2DebugDraw;
import b2RevoluteJointDef = Box2D.Dynamics.Joints.b2RevoluteJointDef;
import b2RevoluteJoint = Box2D.Dynamics.Joints.b2RevoluteJoint;
import b2DistanceJointDef = Box2D.Dynamics.Joints.b2DistanceJointDef;
import b2DistanceJoint = Box2D.Dynamics.Joints.b2DistanceJoint;

class GameApp {

    private _world: Box2D.Dynamics.b2World;
    private _wheelBody: b2Body;
    private _wheel: Wheel.Scripts.WheelScript;

    constructor(canvas: HTMLCanvasElement) {

        this._world = new Box2D.Dynamics.b2World(new Box2D.Common.Math.b2Vec2(0, 10), true);
        this._wheel = new Wheel.Scripts.WheelScript();

        let debugDraw = new Box2D.Dynamics.b2DebugDraw();
        debugDraw.SetSprite(canvas.getContext("2d"));
        debugDraw.SetDrawScale(1.0);
        debugDraw.SetFillAlpha(0.3);
        debugDraw.SetLineThickness(1.0);
        debugDraw.SetFlags(Box2D.Dynamics.b2DebugDraw.e_shapeBit | Box2D.Dynamics.b2DebugDraw.e_jointBit);
        this._world.SetDebugDraw(debugDraw);
    }

    start() {

        //create ground
        var fixDef = new b2FixtureDef();
        fixDef.density = 1.0;
        fixDef.friction = 0.5;
        fixDef.restitution = 0.2;
        var bodyDef = new b2BodyDef();
        bodyDef.type = b2Body.b2_staticBody;
        bodyDef.position.x = 10;
        bodyDef.position.y = 350;
        let sh = new b2PolygonShape();
        sh.SetAsBox(1000, 5);
        fixDef.shape = sh;
        this._world.CreateBody(bodyDef).CreateFixture(fixDef);

        //create some objects
        bodyDef.type = b2Body.b2_dynamicBody;
        for (var i = 0; i < 10; ++i) {
            if (Math.random() > 0.5) {
                sh = new b2PolygonShape();
                sh.SetAsBox(
                      Math.random() + 10 //half width
                    , Math.random() + 10 //half height
                );
                fixDef.shape = sh;
            } else {
                fixDef.shape = new b2CircleShape(
                    Math.random() + 10 //radius
                );
            }
            bodyDef.position.x = Math.random() * 500;
            bodyDef.position.y = 0;
            this._world.CreateBody(bodyDef).CreateFixture(fixDef);
        }

        // == body with multiple fixtures ==

        // base, used for anchoring
        var bodyDef = new b2BodyDef();
        bodyDef.type = b2Body.b2_staticBody;
        bodyDef.position.x = 350;
        bodyDef.position.y = 200;
        sh = new b2PolygonShape();
        sh.SetAsBox(10, 10);
        fixDef.shape = sh;
        let wheelBaseBody = this._world.CreateBody(bodyDef);
        wheelBaseBody.CreateFixture(fixDef);

        // outer wheel shape
        bodyDef = new b2BodyDef;
        bodyDef.type = b2Body.b2_kinematicBody;
        bodyDef.position.x = 350;
        bodyDef.position.y = 200;
        this._wheelBody = this._world.CreateBody(bodyDef);
        let wheelRadius = 100;
        fixDef = new b2FixtureDef;
        fixDef.shape = new b2CircleShape(wheelRadius);
        this._wheelBody.CreateFixture(fixDef);

        // revolute joint for wheel and base (optional)
        // not really needed if wheel body is kynematic
        let jdef = new b2RevoluteJointDef();
        jdef.bodyA = this._wheelBody;
        jdef.bodyB = wheelBaseBody;
        this._world.CreateJoint(jdef);

        // wheel pegs
        let numSegments = 16;
        let fixturePeg: b2CircleShape;
        let radius = 5;
        let d0 = Math.PI * 2 / numSegments;
        for (let i = 0; i < numSegments; i++) {
            fixturePeg = new b2CircleShape(radius);
            let theta = d0 * i;
            let pos = new b2Vec2();
            pos.x = wheelRadius * Math.cos(theta);
            pos.y = wheelRadius * Math.sin(theta);
            fixturePeg.SetLocalPosition(pos);
            this._wheelBody.CreateFixture2(fixturePeg);
        }

        // ==wheel rudder==

        bodyDef = new b2BodyDef();
        bodyDef.type = b2Body.b2_dynamicBody;
        fixDef.density = 1.0;
        fixDef.friction = 0.5;
        fixDef.restitution = 0.2;
        bodyDef.position.x = 350;
        bodyDef.position.y = 200 - 100 - 13;
        sh = new b2PolygonShape();
        sh.SetAsBox(2, 10);
        fixDef.shape = sh;
        let wheelRudder = this._world.CreateBody(bodyDef);
        wheelRudder.CreateFixture(fixDef);

        // attaching rudder with wheel base with revolute joint
        // this causes the rudder to rotate if the base is rotated.
        jdef = new b2RevoluteJointDef();
        let pivot = new b2Vec2(wheelRudder.GetWorldCenter().x, wheelRudder.GetWorldCenter().y - 4);
        jdef.Initialize(wheelRudder, wheelBaseBody, pivot);
        this._world.CreateJoint(jdef);

        // left spring-like joint
        let ddef = new b2DistanceJointDef();
        ddef.frequencyHz = 20;
        ddef.dampingRatio = 0.2;
        let pivotA = new b2Vec2(wheelRudder.GetWorldCenter().x - 2, wheelRudder.GetWorldCenter().y - 4);
        let pivotB = new b2Vec2(wheelRudder.GetWorldCenter().x - 15, wheelRudder.GetWorldCenter().y);
        ddef.Initialize(wheelRudder, wheelBaseBody, pivotA, pivotB);
        this._world.CreateJoint(ddef);

        // right spring-linke joint
        ddef = new b2DistanceJointDef();
        ddef.frequencyHz = 20;
        ddef.dampingRatio = 0.2;
        pivotA = new b2Vec2(wheelRudder.GetWorldCenter().x + 2, wheelRudder.GetWorldCenter().y - 4);
        pivotB = new b2Vec2(wheelRudder.GetWorldCenter().x + 15, wheelRudder.GetWorldCenter().y);
        ddef.Initialize(wheelRudder, wheelBaseBody, pivotA, pivotB);
        this._world.CreateJoint(ddef);

        // rotate the whole wheel body a bit
        wheelBaseBody.SetAngle(Math.PI / 4);
    }

    update(dt: number) {

        // do simulation
        this._wheel.update(dt);

        this._wheelBody.SetAngle(this._wheel.getAngle());

        // step world
        this._world.Step(
            dt        //frame-rate
            , 2       //velocity iterations
            , 2       //position iterations
        );
        this._world.DrawDebugData();
        this._world.ClearForces();
    }

    onClick(e: any) {
        /*
        if (this._wheelBody.GetAngularVelocity() > 0) {
            this._wheelBody.SetAngularVelocity(0);
        } else {
            this._wheelBody.SetAngularVelocity(1.5);
        }
        
        this._wheelBody.SetAwake(true);
        */

        this._wheel.start(Math.random() * Math.PI * 2.0);
        this._wheelBody.SetAwake(true);
    }
}

var g_app: GameApp;

window.onload = () => {

    var canvas = document.getElementById('canvas') as HTMLCanvasElement;
    g_app = new GameApp(canvas);
    g_app.start();

    canvas.addEventListener("click", onClick, false);

    window.setInterval(update, 1000.0 / 60.0);
};

function update() {

    g_app.update(1.0/60.0);
};

function onClick(e) {

    g_app.onClick(e);
}
