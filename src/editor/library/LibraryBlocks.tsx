import "./library.css";
import { Renderer } from "../trees/render";
import { LibraryCategories, LibraryCategory } from "./library-defs";
import { LibraryPageID, Tree } from "../trees/trees";
import Nav from "react-bootstrap/Nav";
import Tab from "react-bootstrap/Tab";
import { InitialEnvironment } from "./environments";
import { Typechecker } from "../../typechecker/typecheck";
import { rootIndexPath } from "../trees/tree";
import { Program } from "../../simulator/program";
import { Editor } from "../state/Editor";

export default function LibraryBlocks() {
  return <LibraryCategoryTabs categories={LibraryCategories} />;
}

function LibraryCategoryTabs({ categories }: { categories?: LibraryCategory[] }) {
  if (!categories?.length) return <></>;
  return (
    <Tab.Container defaultActiveKey={0}>
      <Nav variant="pills" className="library-category-tabs">
        {categories.map((category, categoryIndex) => (
          <Nav.Item key={categoryIndex}>
            <Nav.Link eventKey={categoryIndex}>
              <div className="library-nav-link-text">{category.name}</div>
            </Nav.Link>
          </Nav.Item>
        ))}
      </Nav>
      <Tab.Content>
        {categories.map((category, categoryIndex) => (
          <Tab.Pane key={categoryIndex} eventKey={categoryIndex} transition={false} unmountOnExit>
            {category.entries?.map((expr, index) => {
              const tree: Tree = {
                id: `library-${categoryIndex}-${index}`,
                root: expr,
                location: { x: 0, y: 0 },
                page: LibraryPageID,
                zIndex: 1,
              };

              return new Renderer(InitialEnvironment, new Typechecker(), Editor.empty(), {}).render(
                rootIndexPath(tree),
                {
                  isCopySource: true,
                },
              );
            })}

            {<LibraryCategoryTabs categories={category.subcategories} />}
          </Tab.Pane>
        ))}
      </Tab.Content>
    </Tab.Container>
  );
}
