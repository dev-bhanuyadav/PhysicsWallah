import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Batches from "@/pages/Batches";
import Admin from "@/pages/Admin";
import BatchDetails from "@/pages/BatchDetails";
import SubjectTopics from "@/pages/SubjectTopics";
import TopicContents from "@/pages/TopicContents";
import VideoPlayer from "@/pages/VideoPlayer";
import Layout from "@/components/Layout";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/batches" element={<Layout><Batches /></Layout>} />
        <Route path="/batches/:batchId" element={<Layout><BatchDetails /></Layout>} />
        <Route path="/batches/:batchId/subjects/:subjectId" element={<Layout><SubjectTopics /></Layout>} />
        <Route path="/batches/:batchId/subjects/:subjectId/contents/:topicSlug" element={<Layout><TopicContents /></Layout>} />
        <Route path="/batches/:batchId/subjects/:subjectId/video/:childId" element={<VideoPlayer />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  );
}
