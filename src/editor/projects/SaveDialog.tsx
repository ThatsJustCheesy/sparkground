import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import ListGroup from "react-bootstrap/ListGroup";
import ListGroupItem from "react-bootstrap/ListGroupItem";
import { FileEarmarkArrowDownFill, PlusSquareFill } from "react-bootstrap-icons";
import { useEffect, useState } from "react";
import { Project, projectsDB } from "./project";
import { globalMeta, trees } from "../trees/trees";
import { serializeExprWithAttributes } from "../trees/serialize";
import { serializeProjectMeta } from "../../project-meta";

export type Props = {
  show: boolean;
  onHide: () => void;
};

export default function SaveDialog({ show, onHide }: Props) {
  const [projects, setProjects] = useState<Project[]>();

  async function fetchProjects() {
    const db = await projectsDB();
    const projects = await db.getAll("projects");
    setProjects(projects.sort((a, b) => (b.modified ?? 0) - (a.modified ?? 0)));
  }

  useEffect(() => {
    if (show) fetchProjects();
  }, [show]);

  function serializeProject(name: string): Project {
    const source =
      serializeProjectMeta(globalMeta) +
      trees()
        .map((tree) => {
          tree.root.attributes = tree.root.attributes ?? {};
          tree.root.attributes.location = tree.location;
          tree.root.attributes.page = tree.page;
          return serializeExprWithAttributes(tree.root);
        })
        .join("\n");

    return {
      modified: new Date().getTime(),
      name,
      source,
    };
  }

  return (
    <Modal
      size="lg"
      show={show}
      onHide={() => onHide()}
      centered
      backdropClassName="modal-backdrop"
    >
      <Modal.Header closeButton>
        <Modal.Title>Save Project</Modal.Title>
      </Modal.Header>
      <Modal.Body
        style={{
          height: "50vh",
          overflow: "auto",
        }}
      >
        <ListGroup className="mb-2">
          {projects?.map((project) => (
            <ListGroupItem key={project.id} className="d-flex align-items-center">
              <div className="me-auto">{project.name}</div>

              <Button
                size="sm"
                variant="outline-success"
                className="d-flex align-items-center me-2"
                onClick={async (event) => {
                  event.stopPropagation();

                  const newProject = serializeProject(project.name);
                  newProject.id = project.id;

                  const db = await projectsDB();
                  db.put("projects", newProject);

                  onHide();
                }}
              >
                <FileEarmarkArrowDownFill className="me-2" />
                Overwrite
              </Button>
            </ListGroupItem>
          ))}
        </ListGroup>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="success"
          className="d-flex align-items-center"
          onClick={async (event) => {
            event.stopPropagation();

            const name = prompt("Name your project:");
            if (name === null) return;

            const project = serializeProject(name);

            const db = await projectsDB();
            db.add("projects", project);

            onHide();
          }}
        >
          <PlusSquareFill className="me-2" />
          Save New
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
