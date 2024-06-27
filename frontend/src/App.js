import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./Pages/HomePage";
import { Navigate } from "react-router-dom";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>

        <Route index element={<HomePage />} />

        {/* <Route path="post">
          <Route index element={<AddPostForm />} />
          <Route path=":postId" element={<SinglePostPage />} />
          <Route path="edit/:postId" element={<EditPostForm />}></Route>
        </Route>

        <Route path="user">
          <Route index element={<UsersList />} />
          <Route path=":userId" element={<UserPage />} />
        </Route>

        Catch all - replace with 404 component if you want
        <Route path="*" element={<Navigate to="/" replace />} /> */}

      </Route>
    </Routes>
  )
}

export default App;
