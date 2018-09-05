import React from "react";
import ReactDOM from "react-dom";
import {
  Table,
  Collapse,
  Spin,
  Card,
  Progress,
  Tag,
  Input,
  List,
  Row,
  Col,
  Badge
} from "antd";
import { withState } from "recompose";
import "antd/dist/antd.css"; // or 'antd/dist/antd.less'

import "./styles.css";

const Search = Input.Search;

class App extends React.Component {
  state = {
    loading: true
  };
  async componentWillMount() {
    const data = await download();
    this.setState({
      loading: false,
      data
    });
  }
  render() {
    return (
      <div className="App">
        {this.state.loading && <Spin size="large" />}
        {!this.state.loading && <StatedExplorer {...this.state} />}
      </div>
    );
  }
}

const StatedExplorer = withState("search", "setSearch", 0)(Explorer);
function Explorer({ data, search, setSearch }) {
  const steps = data.Features.reduce(
    (acc, cur) =>
      acc + cur.Feature.FeatureElements.reduce((a, c) => c.Steps.length + a, 0),
    0
  );
  const featureList = data.Features.reduce(
    (acc, cur) => [
      ...acc,
      ...cur.Feature.FeatureElements.map(f => ({ ...f, parent: cur }))
    ],
    []
  ).filter(s => {
    if (!search) return true;
    return (
      s.Name.indexOf(search) >= 0 || s.parent.Feature.Name.indexOf(search) >= 0
    );
  });
  const aggregates = {
    features: data.Features.length,
    scenarios: data.Features.reduce(
      (acc, cur) => cur.Feature.FeatureElements.length + acc,
      0
    ),
    steps,
    tags: data.Features.reduce((acc, cur) => {
      const children = cur.Feature.FeatureElements;
      const childCount = children && children.length ? children.length : 0;
      const featuretags = cur.Feature.Tags.reduce(
        (acc, tag) => ({ ...acc, [tag]: 0 + acc[tag] + childCount }),
        acc
      );

      return children.reduce((acc, scenario) => {
        return scenario.Tags.reduce(
          (acc, tag) => ({ ...acc, [tag]: acc[tag] ? 0 + acc[tag] + 1 : 1 }),
          acc
        );
      }, featuretags);
    }, {})
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "Name",
      sorter: (a, b) => a.Name.localeCompare(b.Name)
    },
    {
      title: "Tags",
      dataIndex: "Feature.Tags",
      onFilter: (value, record) => record.Feature.Tags.indexOf(value) === 0,
      filters: Object.keys(aggregates.tags).map(t => ({
        text: `${t} (${aggregates.tags[t]})`,
        value: t
      }))
    },
    {
      title: "File",
      dataIndex: "RelativeFolder",
      sorter: (a, b) => a.RelativeFolder.localeCompare(b.RelativeFolder)
    },
    {
      title: "Scenarios",
      dataIndex: "Feature.FeatureElements.length",
      defaultSortOrder: "descend",
      sorter: (a, b) =>
        a.Feature.FeatureElements.length - b.Feature.FeatureElements.length
    },
    {
      title: "Steps",
      dataIndex: "steps",
      defaultSortOrder: "descend",
      sorter: (a, b) => a.steps - b.steps
    }
  ];

  const featureColumns = [
    {
      title: "Parent",
      key: "parent",
      render(text, record, index) {
        return (
          <span>
            {record.parent.Feature.Name}
            <br />
            <code style={{ color: "#CCC" }}>
              {record.parent.RelativeFolder}
            </code>
          </span>
        );
      },
      sorter: (a, b) =>
        a.parent.Feature.Name.localeCompare(b.parent.Feature.Name)
    },
    {
      title: "Name",
      dataIndex: "Name",
      sorter: (a, b) => a.Name.localeCompare(b.Name)
    },
    {
      title: "Tags",
      dataIndex: "Tags",
      key: "tags",
      render(text, record, index) {
        return (
          <span key={index}>
            {record.Tags.map((t, i) => <Tag key={i}>{t}</Tag>)}
            <br />
            Inherited:{" "}
            {record.parent.Feature.Tags.map((t, i) => <Tag key={i}>{t}</Tag>)}
          </span>
        );
      },
      onFilter: (value, record) =>
        record.Tags.indexOf(value) === 0 ||
        record.parent.Feature.Tags.indexOf(value) === 0,
      filters: Object.keys(aggregates.tags).map(t => ({
        text: `${t}`,
        value: t
      }))
    },
    {
      title: "Steps",
      dataIndex: "Steps.length",
      defaultSortOrder: "descend",
      sorter: (a, b) => a.Steps.length - b.Steps.length
    }
  ];

  return (
    <div>
      <div style={{ background: "#ECECEC", padding: "30px" }}>
        <Row gutter={16}>
          <Col span={8}>
            <Card title="Stats">
              <p>
                <Progress
                  percent={Math.round(
                    (aggregates.tags["@automated"] / aggregates.scenarios) * 100
                  )}
                />
                <b>{aggregates.tags["@automated"]}</b> of{" "}
                <b>{aggregates.scenarios}</b> scenarios automated
              </p>
              <p>
                <b>{aggregates.features}</b> features and{" "}
                <b>{aggregates.steps}</b> steps
              </p>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="Tags" style={{ height: 197, overflowY: "scroll" }}>
              {Object.keys(aggregates.tags).map((tag, i) => (
                <p>
                  {tag} - <code>{aggregates.tags[tag]}</code>
                  <Progress
                    percent={Math.round(
                      (aggregates.tags[tag] / aggregates.scenarios) * 100
                    )}
                  />
                </p>
              ))}
            </Card>
          </Col>
        </Row>
      </div>
      <Collapse defaultActiveKey={["0"]}>
        <Collapse.Panel header="Scenarios" key="0">
          <Search
            placeholder="Search features"
            onSearch={value => setSearch(value)}
            style={{ width: 200 }}
          />
          <Table
            rowKey="slug"
            dataSource={featureList}
            columns={featureColumns}
            expandedRowRender={record => (
              <div>
                {record.Examples &&
                  record.Examples[0] && (
                    <div>
                      <h3>Examples</h3>
                      <Table
                        bordered
                        pagination={false}
                        dataSource={record.Examples[0].TableArgument.DataRows}
                        columns={record.Examples[0].TableArgument.HeaderRow.map(
                          (k, i) => ({ title: k, dataIndex: i })
                        )}
                      />
                      <p>Perform this test with each of the above entries</p>
                    </div>
                  )}
                <List
                  bordered
                  dataSource={record.Steps}
                  renderItem={item => (
                    <List.Item>
                      {item.Keyword} {item.Name}
                    </List.Item>
                  )}
                />
              </div>
            )}
          />
        </Collapse.Panel>
        <Collapse.Panel header="Features" key="1">
          <Table
            rowKey="slug"
            dataSource={data.Features.map(f => ({
              ...f,
              Name: f.Feature.Name,
              steps: f.Feature.FeatureElements.reduce(
                (acc, cur) => acc + cur.Steps.length,
                0
              ),
              children: f.FeatureElements
            }))}
            columns={columns}
          />
        </Collapse.Panel>
        <Collapse.Panel header="JSON" key="2">
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </Collapse.Panel>
      </Collapse>
    </div>
  );
}

async function download() {
  // if (!localStorage.getItem("features")) {
  const features = await fetch(
    "https://pickled-saasquatch.surge.sh/pickledFeatures.json"
    // "https://www.picklesdoc.com/pickles/Output/JSON/pickledFeatures.json"
    // { mode: "no-cors" }
  );
  const json = await features.json();
  console.log("Fetched fresh", json);
  localStorage.setItem("features", JSON.stringify(json));
  return json;
  // }
  // return JSON.parse(localStorage.getItem("features"));
}
const rootElement = document.getElementById("root");

//   "TableArgument": {
//     "HeaderRow": [
//       "mode"
//     ],
//     "DataRows": [

//  *
//  */
ReactDOM.render(<App />, rootElement);
