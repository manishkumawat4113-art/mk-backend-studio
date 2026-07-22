const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());


// ======================================
// IN-MEMORY PROJECT DATABASE
// ======================================

const projects = new Map();


// ======================================
// HOME
// ======================================

app.get("/", (req, res) => {

    res.json({
        success: true,
        message: "MK Backend Studio is online",
        status: "online"
    });

});


// ======================================
// BACKEND STATUS
// ======================================

app.get("/api/status", (req, res) => {

    res.json({
        success: true,
        status: "online",
        message: "MK Backend Studio is working"
    });

});


// ======================================
// CREATE PROJECT
// ======================================

app.post("/api/projects", (req, res) => {

    const {
        name,
        description
    } = req.body;

    if (!name) {

        return res.status(400).json({
            success: false,
            message: "Project name is required"
        });

    }

    const id =
        crypto.randomUUID();

    const project = {

        id: id,

        name: name,

        description:
            description || "",

        status: "Stopped",

        files: {

            "server.js":
`const express = require("express");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {

    res.json({

        success: true,

        message: "My Backend Is Working"

    });

});

app.get("/api/hello", (req, res) => {

    res.json({

        success: true,

        message: "Hello From My Backend"

    });

});

module.exports = app;`,

            "package.json":
`{
    "name": "my-backend",
    "version": "1.0.0",
    "main": "server.js"
}`

        }

    };


    projects.set(
        id,
        project
    );


    res.status(201).json({

        success: true,

        message:
            "Project created successfully",

        project:
            project

    });

});


// ======================================
// GET ALL PROJECTS
// ======================================

app.get("/api/projects", (req, res) => {

    res.json({

        success: true,

        projects:
            Array.from(
                projects.values()
            )

    });

});


// ======================================
// GET SINGLE PROJECT
// ======================================

app.get(
    "/api/projects/:id",
    (req, res) => {

        const project =
            projects.get(
                req.params.id
            );


        if (!project) {

            return res.status(404).json({

                success: false,

                message:
                    "Project not found"

            });

        }


        res.json({

            success: true,

            project:
                project

        });

    }
);


// ======================================
// SAVE FILE
// ======================================

app.put(
    "/api/projects/:id/files/:fileName",
    (req, res) => {

        const project =
            projects.get(
                req.params.id
            );


        if (!project) {

            return res.status(404).json({

                success: false,

                message:
                    "Project not found"

            });

        }


        const fileName =
            req.params.fileName;


        const code =
            req.body.code || "";


        project.files[fileName] =
            code;


        res.json({

            success: true,

            message:
                "File saved successfully",

            fileName:
                fileName

        });

    }
);


// ======================================
// RUN PROJECT
// ======================================

app.post(
    "/api/projects/:id/run",
    (req, res) => {

        const project =
            projects.get(
                req.params.id
            );


        if (!project) {

            return res.status(404).json({

                success: false,

                message:
                    "Project not found"

            });

        }


        project.status =
            "Running";


        const baseUrl =
            `${req.protocol}://${req.get("host")}`;


        const publicUrl =
            `${baseUrl}/api/project/${project.id}`;


        project.publicUrl =
            publicUrl;


        res.json({

            success: true,

            message:
                "Project started successfully",

            status:
                "Running",

            publicUrl:
                publicUrl

        });

    }
);


// ======================================
// STOP PROJECT
// ======================================

app.post(
    "/api/projects/:id/stop",
    (req, res) => {

        const project =
            projects.get(
                req.params.id
            );


        if (!project) {

            return res.status(404).json({

                success: false,

                message:
                    "Project not found"

            });

        }


        project.status =
            "Stopped";


        res.json({

            success: true,

            message:
                "Project stopped",

            status:
                "Stopped"

        });

    }
);


// ======================================
// PROJECT PUBLIC API
// ======================================

app.get(
    "/api/project/:id",
    (req, res) => {

        const project =
            projects.get(
                req.params.id
            );


        if (!project) {

            return res.status(404).json({

                success: false,

                message:
                    "Project not found"

            });

        }


        if (
            project.status !==
            "Running"
        ) {

            return res.status(503).json({

                success: false,

                message:
                    "Project is not running"

            });

        }


        res.json({

            success: true,

            project:
                project.name,

            message:
                "Your backend is working",

            backend:
                "MK Backend Studio"

        });

    }
);


// ======================================
// DELETE PROJECT
// ======================================

app.delete(
    "/api/projects/:id",
    (req, res) => {

        const deleted =
            projects.delete(
                req.params.id
            );


        if (!deleted) {

            return res.status(404).json({

                success: false,

                message:
                    "Project not found"

            });

        }


        res.json({

            success: true,

            message:
                "Project deleted"

        });

    }
);


// ======================================
// START MK BACKEND STUDIO
// ======================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `MK Backend Studio running on port ${PORT}`
        );

    }
);
