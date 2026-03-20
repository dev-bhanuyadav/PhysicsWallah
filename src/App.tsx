import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Batches from "@/pages/Batches";
import Admin from "@/pages/Admin";
import BatchDetails from "@/pages/BatchDetails";
import SubjectTopics from "@/pages/SubjectTopics";
import TopicContents from "@/pages/TopicContents";
import VideoPlayer from "@/pages/VideoPlayer";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/batches" element={<Batches />} />
        <Route path="/batches/:batchId" element={<BatchDetails />} />
        <Route path="/batches/:batchId/subjects/:subjectId" element={<SubjectTopics />} />
        <Route path="/batches/:batchId/subjects/:subjectId/contents/:topicSlug" element={<TopicContents />} />
        <Route path="/batches/:batchId/subjects/:subjectId/video/:childId" element={<VideoPlayer />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  );
}
