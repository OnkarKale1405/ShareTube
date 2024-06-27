const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next))
        .catch( err => next(err) );
    }
}

export { asyncHandler }

/*
// second method 
const asyncHandler = (requestHandler) => async (req, res, next) => {
    try{
        await requestHandler(req, re, next) ;
    }
    catch ( err ){
        res.send(err.code || 500).json({
            success: false,
            message: err.message
        })
    }
}
*/